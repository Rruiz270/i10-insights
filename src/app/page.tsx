export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-gradient-main text-white">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-pale uppercase">
            Instituto i10 · Brandbook v2 ativo
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            i10 Insights
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
            Análise diária sobre inteligência artificial na educação — pesquisa,
            política pública, ferramentas e equidade. Publicamos toda semana, em
            português e inglês.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/20">
              Brand tokens carregados
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/20">
              Fontes Inter + Source Serif 4
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/20">
              Tailwind v4 + Next 16
            </span>
          </div>
        </div>
      </section>

      <section className="bg-off-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan uppercase">
            Status do projeto
          </p>
          <h2 className="mt-3 font-serif text-3xl text-navy">
            Fase 1 em construção
          </h2>
          <ul className="mt-6 space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-green" />
              Scaffold Next.js 16 + Tailwind v4 + brand tokens
            </li>
            <li className="flex gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-cyan" />
              i18n routing (PT-BR + EN), hub e template de artigo
            </li>
            <li className="flex gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-cyan" />
              Schema Neon (insights.drafts, articles, subscribers)
            </li>
            <li className="flex gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-gray-300" />
              Pipeline Manus (cron diário + webhook)
            </li>
            <li className="flex gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-gray-300" />
              Newsletter Resend + LGPD double opt-in
            </li>
            <li className="flex gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-gray-300" />
              Dashboard de aprovação + assinantes
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
