/**
 * Audience Hub — single source of truth for "who do we email".
 *
 * Every audience-holding app at Instituto i10 lives on the SAME Neon endpoint,
 * split into databases (bncc_webinar, webinar_fundeb, i10_marketing) and schemas.
 * The i10-insights credential already reaches all of them, so we read subscribers
 * DIRECTLY from the database instead of calling each app's HTTP admin API with a
 * hardcoded token. Adding a new source = add an entry to SOURCES below — never a
 * new cross-app secret to leak.
 *
 * Each source's `query` must return rows shaped { email, name, created_at }.
 * Consent: only register opt-in audiences, and filter on each table's consent
 * column where one exists (e.g. inscricoes.aceita_atualizacoes).
 */

import { neon } from "@neondatabase/serverless";

// Sibling databases share one endpoint — swap the db name in the base URL to
// reach them with the same credentials.
export function connFor(baseUrl, db) {
  if (!db) return neon(baseUrl);
  return neon(baseUrl.replace(/\/[A-Za-z0-9_-]+(\?)/, `/${db}$1`));
}

// Registered audiences. `db: null` = the base database (bncc_webinar).
// Flip `enabled` to bring a source in or out of the blast.
export const SOURCES = [
  {
    key: "bncc-inscricoes",
    label: "BNCC Computação — inscritos (opt-in)",
    db: null,
    enabled: true,
    query: (sql) => sql`
      SELECT email, nome AS name, created_at
      FROM public.inscricoes
      WHERE aceita_atualizacoes = true
        AND email IS NOT NULL AND email <> ''
    `,
  },
  {
    key: "report-downloads",
    label: "Downloads de relatório (lead magnet)",
    db: null,
    enabled: true,
    query: (sql) => sql`
      SELECT email, nome AS name, sent_at AS created_at
      FROM public.report_downloads
      WHERE email IS NOT NULL AND email <> ''
    `,
  },
  {
    key: "crm-contacts",
    label: "CRM — contatos de oportunidade (B2B)",
    db: null,
    enabled: false, // B2B relationships — enable deliberately, not by default
    query: (sql) => sql`
      SELECT email, name, created_at
      FROM crm.contacts
      WHERE email IS NOT NULL AND email <> ''
    `,
  },
  // Ready to enable — same credentials, different database:
  // {
  //   key: "fundeb-inscricoes", label: "Webinar FUNDEB — inscritos",
  //   db: "webinar_fundeb", enabled: false,
  //   query: (sql) => sql`SELECT email, nome AS name, created_at FROM public.inscricoes WHERE email IS NOT NULL`,
  // },
];

const normEmail = (e) => (e ?? "").trim().toLowerCase();

/**
 * Collect every enabled source, normalize + dedupe by email (first source wins),
 * then drop anyone who unsubscribed or already got an invite. Insights state
 * (subscribers / email_log) lives in the base database.
 *
 * Returns [{ email, name, source, created_at }].
 */
export async function getInviteAudience(
  baseUrl,
  { excludeUnsubscribed = true, excludeAlreadyInvited = true } = {},
) {
  const base = neon(baseUrl);
  const byEmail = new Map();
  const perSource = {};

  for (const src of SOURCES) {
    if (!src.enabled) continue;
    const sql = connFor(baseUrl, src.db);
    let rows = [];
    try {
      rows = await src.query(sql);
    } catch (e) {
      console.warn(`⚠ fonte "${src.key}" falhou: ${e.message}`);
      continue;
    }
    let kept = 0;
    for (const r of rows) {
      const email = normEmail(r.email);
      if (!email.includes("@")) continue;
      if (!byEmail.has(email)) {
        byEmail.set(email, {
          email,
          name: (r.name ?? "").trim(),
          source: src.key,
          created_at: r.created_at ?? null,
        });
        kept++;
      }
    }
    perSource[src.key] = { rows: rows.length, newEmails: kept };
  }

  if (excludeUnsubscribed) {
    const unsub = await base`
      SELECT lower(email) AS email FROM insights.subscribers WHERE status = 'unsubscribed'
    `;
    for (const r of unsub) byEmail.delete(r.email);
  }
  if (excludeAlreadyInvited) {
    const invited = await base`
      SELECT DISTINCT lower(email) AS email FROM insights.email_log WHERE kind = 'invite'
    `;
    for (const r of invited) byEmail.delete(r.email);
  }

  return { audience: [...byEmail.values()], perSource };
}
