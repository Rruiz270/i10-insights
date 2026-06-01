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
const cleanEmail = (s) => {
  const v = String(s ?? "").trim().toLowerCase();
  return v.includes("@") && v.split("@")[1]?.includes(".") ? v : null;
};

// ── Normalization (so the base reads consistently across all sources) ──
const MINOR = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "von"]);
function titleCase(s) {
  s = clean(s);
  if (!s) return null;
  if (s.length <= 3 && s === s.toUpperCase()) return s; // keep acronyms (SP, RJ)
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && MINOR.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Brazilian phones → "(DD) 9XXXX-XXXX" / "(DD) XXXX-XXXX". Strips the 55 country
// code; leaves anything unrecognizable as raw digits (better than dropping it).
function fmtPhone(s) {
  let d = String(s ?? "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d.length >= 8 ? d : null;
}

// One stable, meaningful display name per role.
function displayName(role, rawName, municipio) {
  if (role === "prefeitura" || role === "gabinete")
    return municipio ? `Prefeitura de ${municipio}` : "Prefeitura";
  if (role === "educacao")
    return municipio ? `Secretaria de Educação de ${municipio}` : "Secretaria de Educação";
  return titleCase(rawName);
}

function row(r) {
  const email = cleanEmail(r.email);
  const phone = fmtPhone(r.phone);
  if (!email && !phone) return null;

  const municipio = titleCase(r.municipio);
  const role = clean(r.role);
  const attributes = { ...(r.attributes ?? {}) };
  // Preserve the mayor on institutional rows where we replace the name.
  if ((role === "prefeitura" || role === "gabinete") && r.name && !/\(/.test(r.name)) {
    attributes.prefeito = titleCase(r.name);
  }

  return {
    email, phone,
    name: displayName(role, r.name, municipio),
    role,
    municipio,
    uf: r.uf ? String(r.uf).toUpperCase() : null,
    source: r.source, segment: clean(r.segment),
    consent: typeof r.consent === "boolean" ? r.consent : null,
    attributes,
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

  if (process.env.FRESH === "1") {
    console.log("FRESH=1 → TRUNCATE audience.contacts");
    await sql`TRUNCATE audience.contacts RESTART IDENTITY`;
  }

  console.log("Upsert em audience.contacts...");
  await upsert(sql, all);

  const [tot] = await sql`SELECT count(*)::int n FROM audience.contacts`;
  console.log(`\n✓ audience.contacts agora tem ${tot.n} contatos.`);
}

main().catch((e) => {
  console.error("\nFatal:", e.message);
  process.exit(1);
});
