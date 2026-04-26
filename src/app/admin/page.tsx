import Link from "next/link";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

async function getCounts() {
  const sql = neon(process.env.DATABASE_URL!);
  const [drafts] = await sql`
    SELECT
      count(*) FILTER (WHERE status = 'pending') AS pending,
      count(*) FILTER (WHERE status = 'approved') AS approved,
      count(*) FILTER (WHERE status = 'published') AS published,
      count(*) FILTER (WHERE status = 'rejected') AS rejected
    FROM insights.drafts
  `;
  const [articles] = await sql`SELECT count(*) AS total FROM insights.articles`;
  const [subscribers] = await sql`
    SELECT
      count(*) FILTER (WHERE status = 'pending_confirmation') AS pending,
      count(*) FILTER (WHERE status = 'confirmed') AS confirmed,
      count(*) FILTER (WHERE status = 'unsubscribed') AS unsubscribed,
      count(*) AS total
    FROM insights.subscribers
  `;
  return { drafts, articles, subscribers };
}

export default async function AdminHome() {
  const c = await getCounts();
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="border-b border-gray-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
          i10 Insights
        </p>
        <h1 className="mt-1 font-serif text-3xl text-navy">Admin</h1>
      </header>

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <Link
          href="/admin/drafts"
          className="block rounded-xl border border-gray-200 bg-white p-6 hover:border-cyan"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Drafts
          </p>
          <p className="mt-2 font-serif text-3xl text-navy">
            {String(c.drafts.pending)}{" "}
            <span className="text-base font-sans text-gray-500">
              pendentes
            </span>
          </p>
          <p className="mt-3 text-sm text-gray-600">
            {String(c.drafts.approved)} aprovados, {String(c.drafts.rejected)}{" "}
            rejeitados, {String(c.articles.total)} publicados.
          </p>
        </Link>

        <Link
          href="/admin/subscribers"
          className="block rounded-xl border border-gray-200 bg-white p-6 hover:border-cyan"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Inscritos
          </p>
          <p className="mt-2 font-serif text-3xl text-navy">
            {String(c.subscribers.confirmed)}{" "}
            <span className="text-base font-sans text-gray-500">
              confirmados
            </span>
          </p>
          <p className="mt-3 text-sm text-gray-600">
            {String(c.subscribers.pending)} aguardando, {String(c.subscribers.unsubscribed)}{" "}
            cancelados, {String(c.subscribers.total)} total.
          </p>
        </Link>
      </section>

      <section className="mt-12 text-sm text-gray-600">
        <p>
          <Link href="/pt" className="text-navy underline">
            Ver site público
          </Link>{" "}
          ·{" "}
          <a
            href="/api/cron/daily-brief"
            className="text-navy underline"
            title="Acesso via Bearer CRON_SECRET — só funciona via curl com o token"
          >
            Trigger daily brief manualmente
          </a>
        </p>
      </section>
    </main>
  );
}
