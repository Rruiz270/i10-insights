export const dynamic = "force-dynamic";

interface Vertical {
  key: string;
  name: string;
  description: string;
  href: string;
  external?: boolean;
  accentClass: string;
  iconLetter: string;
  status: "live" | "beta" | "soon";
  meta?: string;
}

// Add new admins here as we ship them. Each tile links to its vertical's
// own auth-protected dashboard. Browser caches Basic Auth per host so a
// single login at any tile carries to the others on the same host.
//
// NOTE on hrefs: tiles use plain <a> (not Next.js <Link>) so navigation
// is treated as cross-app — Next.js with basePath=/insights would
// otherwise prepend /insights to internal Links and break absolute paths
// like /bncc/admin or /sistemas/apm/dashboard.
const VERTICALS: Vertical[] = [
  {
    key: "insights",
    name: "i10 Insights",
    description:
      "Análise diária de IA na educação. Aprovação de drafts, inscritos da newsletter, métricas de envio.",
    href: "/insights/admin",
    accentClass: "from-cyan to-green",
    iconLetter: "i",
    status: "live",
    meta: "Drafts · Inscritos · Mailing",
  },
  {
    key: "captacao",
    name: "BNCC Captação",
    description:
      "Dashboard APM — cadastro de leads, downloads do kit, métricas de email marketing e treinamento operacional da plataforma.",
    href: "https://i10-audit-crm.vercel.app/apm/dashboard",
    external: true,
    accentClass: "from-navy to-navy-light",
    iconLetter: "C",
    status: "live",
    meta: "APM · Downloads · Email marketing · Treinamento",
  },
  {
    key: "computacao",
    name: "BNCC Computação",
    description:
      "Controle de leads do webinar BNCC, downloads de materiais e gestão dos inscritos.",
    href: "/bncc/admin",
    accentClass: "from-navy to-cyan",
    iconLetter: "B",
    status: "live",
    meta: "Leads · Inscritos · Downloads",
  },
  {
    key: "marketing",
    name: "Marketing Digital",
    description:
      "Calendário editorial Instagram, dashboard Meta (campanhas + orgânico), fila de produção e integração Manus AI para geração de assets.",
    href: "/marketing",
    accentClass: "from-cyan to-green",
    iconLetter: "M",
    status: "live",
    meta: "Calendário · Campanhas · Manus AI",
  },
  {
    key: "soon",
    name: "Em breve",
    description:
      "Próximas verticais aparecem aqui assim que tiverem admin implementado.",
    href: "#",
    accentClass: "from-gray-400 to-gray-300",
    iconLetter: "+",
    status: "soon",
  },
];

export default function AdminHub() {
  return (
    <main className="min-h-screen bg-off-white">
      <header className="bg-navy-dark text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-pale">
              Instituto i10
            </p>
            <h1 className="mt-1 font-serif text-2xl">Admin · Hub</h1>
          </div>
          <a
            href="https://www.institutoi10.com.br"
            className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white"
          >
            ↗ Site público
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="max-w-2xl text-gray-600">
          Cada produto do Instituto i10 tem seu próprio admin. Clique para
          entrar — você só faz login uma vez por sessão (o navegador lembra
          a senha entre os admins).
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {VERTICALS.map((v) => {
            const inner = (
              <div
                className={`group relative h-full overflow-hidden rounded-xl border bg-white p-7 transition ${
                  v.status === "soon"
                    ? "cursor-not-allowed border-gray-200 opacity-60"
                    : "border-gray-200 hover:border-cyan hover:shadow-md"
                }`}
              >
                <div
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${v.accentClass}`}
                />
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${v.accentClass} font-serif text-2xl font-bold text-white`}
                  >
                    {v.iconLetter}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-xl text-navy">
                        {v.name}
                      </h2>
                      {v.status === "live" && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green" />
                      )}
                      {v.status === "soon" && (
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-500">
                          em breve
                        </span>
                      )}
                      {v.external && (
                        <span className="text-xs text-gray-400">↗</span>
                      )}
                    </div>
                    {v.meta && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cyan">
                        {v.meta}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-gray-600">
                      {v.description}
                    </p>
                  </div>
                </div>
                {v.status !== "soon" && (
                  <p className="mt-5 text-xs font-semibold text-navy group-hover:text-cyan">
                    Abrir admin →
                  </p>
                )}
              </div>
            );
            if (v.status === "soon") {
              return (
                <div key={v.key} aria-disabled>
                  {inner}
                </div>
              );
            }
            // Always use plain <a> — basePath would mangle Next.js Link href
            // for cross-app paths (e.g. /sistemas/apm/dashboard).
            return (
              <a
                key={v.key}
                href={v.href}
                target={v.external ? "_blank" : undefined}
                rel={v.external ? "noopener" : undefined}
                className="block"
              >
                {inner}
              </a>
            );
          })}
        </div>

        <footer className="mt-16 border-t border-gray-200 pt-6 text-xs text-gray-500">
          <p>
            Acesso único: a senha é a mesma para todos os admins do Instituto
            i10. Para gerar uma nova, peça pra Claude rodar o snippet de
            rotação no terminal.
          </p>
        </footer>
      </div>
    </main>
  );
}
