/**
 * Populate audience.contacts from every source — idempotent (re-runnable).
 *
 *   DB sources  : BNCC webinar + APM/FUNDEB webinar (inscricoes) + report downloads
 *   File sources: GERAL BR mayors (xlsx), Paraíba, Brasil prefeitos+educação
 *
 * Files are parsed by scripts/audience/parse-files.py (python + openpyxl). Paths
 * default to ~/Downloads and can be overridden via args:
 *   node --env-file=.env.local scripts/audience/import.mjs [mayors.xlsx paraiba.html brasil.html]
 */

import { neon } from "@neondatabase/serverless";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const __dir = dirname(fileURLToPath(import.meta.url));
const base = process.env.DATABASE_URL;
const swap = (db) => base.replace(/\/[A-Za-z0-9_-]+(\?)/, `/${db}$1`);

const clean = (s) => (s == null ? null : String(s).trim() || null);
const cleanPhone = (s) => {
  const d = String(s ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d : null;
};
const cleanEmail = (s) => {
  const v = String(s ?? "").trim().toLowerCase();
  return v.includes("@") && v.split("@")[1]?.includes(".") ? v : null;
};

function row(r) {
  const email = cleanEmail(r.email);
  const phone = cleanPhone(r.phone);
  if (!email && !phone) return null;
  return {
    email, phone,
    name: clean(r.name), role: clean(r.role),
    municipio: clean(r.municipio), uf: r.uf ? String(r.uf).toUpperCase() : null,
    source: r.source, segment: clean(r.segment),
    consent: typeof r.consent === "boolean" ? r.consent : null,
    attributes: r.attributes ?? {},
  };
}

// ── DB sources ───────────────────────────────────────────────────────
async function fromInscricoes(db, source) {
  const sql = db ? neon(swap(db)) : neon(base);
  const rows = await sql`
    SELECT email, telefone, nome, municipio, cargo, aceita_atualizacoes, created_at
    FROM public.inscricoes
  `;
  return rows.map((r) =>
    row({
      email: r.email, phone: r.telefone, name: r.nome, role: "inscrito",
      municipio: r.municipio, uf: null, source, segment: "inscrito",
      consent: r.aceita_atualizacoes, attributes: { cargo: r.cargo },
    }),
  );
}

async function fromReportDownloads() {
  const sql = neon(base);
  const rows = await sql`SELECT email, telefone, nome, municipio FROM public.report_downloads`;
  return rows.map((r) =>
    row({
      email: r.email, phone: r.telefone, name: r.nome, role: "lead",
      municipio: r.municipio, uf: null, source: "report-downloads",
      segment: "download", consent: null, attributes: {},
    }),
  );
}

// ── File sources (via python parser) ─────────────────────────────────
function fromFiles(paths) {
  const json = execFileSync("python3", [join(__dir, "parse-files.py"), ...paths], {
    maxBuffer: 256 * 1024 * 1024,
    encoding: "utf8",
  });
  return JSON.parse(json).map(row);
}

// ── Upsert ───────────────────────────────────────────────────────────
async function upsert(sql, rows) {
  const COLS = ["email", "phone", "name", "role", "municipio", "uf", "source", "segment", "consent", "attributes"];
  const BATCH = 400;
  let n = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const params = [];
    const tuples = slice.map((r) => {
      const base = params.length;
      params.push(r.email, r.phone, r.name, r.role, r.municipio, r.uf, r.source, r.segment, r.consent, JSON.stringify(r.attributes));
      const p = Array.from({ length: COLS.length }, (_, k) => `$${base + k + 1}`);
      p[9] = `${p[9]}::jsonb`;
      return `(${p.join(",")})`;
    });
    await sql.query(
      `INSERT INTO audience.contacts (${COLS.join(",")})
       VALUES ${tuples.join(",")}
       ON CONFLICT (source, coalesce(email,''), coalesce(phone,''), coalesce(role,''))
       DO UPDATE SET
         name = EXCLUDED.name,
         municipio = EXCLUDED.municipio,
         uf = EXCLUDED.uf,
         segment = EXCLUDED.segment,
         consent = COALESCE(EXCLUDED.consent, audience.contacts.consent),
         attributes = audience.contacts.attributes || EXCLUDED.attributes,
         updated_at = now()`,
      params,
    );
    n += slice.length;
    process.stdout.write(`\r  upserted ${n}/${rows.length}`);
  }
  process.stdout.write("\n");
}

async function main() {
  if (!base) throw new Error("DATABASE_URL missing");
  const sql = neon(base);

  const dl = join(homedir(), "Downloads");
  const filePaths = process.argv.slice(2);
  const files =
    filePaths.length === 3
      ? filePaths
      : [
          join(dl, "GERAL BR Brasil.xlsx"),
          join(dl, "paraiba-smart-cities-m5/Paraiba_Contatos_Consolidado.html"),
          join(dl, "contatos_brasil_prefeitos_educacao (1).html"),
        ];

  console.log("Lendo fontes...");
  const [bncc, fundeb, downloads, fileRows] = await Promise.all([
    fromInscricoes(null, "bncc-webinar"),
    fromInscricoes("webinar_fundeb", "apm-fundeb-webinar"),
    fromReportDownloads(),
    Promise.resolve(fromFiles(files)),
  ]);

  const collected = [bncc, fundeb, downloads, fileRows].flat().filter(Boolean);

  // Collapse duplicates on the conflict key (same key twice in one batch makes
  // ON CONFLICT throw). Merge attributes; keep first non-null name/consent.
  const dedup = new Map();
  for (const r of collected) {
    const key = `${r.source}|${r.email ?? ""}|${r.phone ?? ""}|${r.role ?? ""}`;
    const prev = dedup.get(key);
    if (!prev) dedup.set(key, r);
    else {
      prev.attributes = { ...r.attributes, ...prev.attributes };
      prev.name ??= r.name;
      prev.municipio ??= r.municipio;
      prev.uf ??= r.uf;
      prev.consent ??= r.consent;
    }
  }
  const all = [...dedup.values()];

  const bySrc = {};
  all.forEach((r) => (bySrc[r.source] = (bySrc[r.source] || 0) + 1));
  console.log(
    `Coletado: ${collected.length} → ${all.length} após dedup |`,
    JSON.stringify(bySrc),
  );

  console.log("Upsert em audience.contacts...");
  await upsert(sql, all);

  const [tot] = await sql`SELECT count(*)::int n FROM audience.contacts`;
  console.log(`\n✓ audience.contacts agora tem ${tot.n} contatos.`);
}

main().catch((e) => {
  console.error("\nFatal:", e.message);
  process.exit(1);
});
