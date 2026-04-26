import Link from "next/link";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

interface SubRow {
  id: string;
  email: string;
  status: string;
  locale: string;
  created_at: string;
  confirmed_at: string | null;
}

async function getSubscribers(): Promise<SubRow[]> {
  const sql = neon(process.env.DATABASE_URL!);
  return (await sql`
    SELECT id, email, status, locale, created_at, confirmed_at
    FROM insights.subscribers
    ORDER BY created_at DESC
    LIMIT 200
  `) as unknown as SubRow[];
}

export default async function SubscribersPage() {
  const subs = await getSubscribers();
  const counts = subs.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <Link
            href="/admin"
            className="text-xs font-semibold uppercase tracking-wider text-cyan hover:underline"
          >
            ← Admin
          </Link>
          <h1 className="mt-1 font-serif text-3xl text-navy">
            Inscritos ({subs.length} mostrados)
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            confirmed: {counts.confirmed ?? 0} · pending: {counts.pending_confirmation ?? 0} ·
            unsub: {counts.unsubscribed ?? 0}
          </p>
        </div>
        <a
          href="/api/admin/subscribers.csv"
          className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-dark"
        >
          Export CSV
        </a>
      </header>

      <table className="mt-8 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="pb-3">Email</th>
            <th className="pb-3">Status</th>
            <th className="pb-3">Locale</th>
            <th className="pb-3">Cadastrado</th>
            <th className="pb-3">Confirmado</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id} className="border-t border-gray-100">
              <td className="py-3">{s.email}</td>
              <td className="py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === "confirmed"
                      ? "bg-green-pale text-green-dark"
                      : s.status === "pending_confirmation"
                        ? "bg-cyan-pale text-navy"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s.status}
                </span>
              </td>
              <td className="py-3">{s.locale}</td>
              <td className="py-3 text-gray-500">
                {new Date(s.created_at).toLocaleDateString("pt-BR")}
              </td>
              <td className="py-3 text-gray-500">
                {s.confirmed_at
                  ? new Date(s.confirmed_at).toLocaleDateString("pt-BR")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
