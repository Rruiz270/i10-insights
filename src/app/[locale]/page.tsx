import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { getPublishedArticles } from "@/lib/db";
import { NewsletterForm } from "@/components/NewsletterForm";

export const revalidate = 300; // ISR: refresh every 5 minutes

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const articles = await getPublishedArticles(20);

  return (
    <main>
      <Hero locale={locale} />
      {articles.length === 0 ? <Empty locale={locale} /> : <ArticleList locale={locale} articles={articles} />}
    </main>
  );
}

function Hero({ locale }: { locale: Locale }) {
  return (
    <section className="bg-gradient-main text-white">
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-pale uppercase">
          {t(locale, "hub.eyebrow")}
        </p>
        <h1 className="mt-6 font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl">
          {t(locale, "hub.title")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/80">
          {t(locale, "hub.lead")}
        </p>
      </div>
    </section>
  );
}

function Empty({ locale }: { locale: Locale }) {
  return (
    <section className="bg-off-white">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-serif text-3xl text-navy">
          {t(locale, "hub.empty.title")}
        </h2>
        <p className="mt-4 text-gray-700">{t(locale, "hub.empty.body")}</p>
        <NewsletterForm locale={locale} />
      </div>
    </section>
  );
}

function ArticleList({
  locale,
  articles,
}: {
  locale: Locale;
  articles: Awaited<ReturnType<typeof getPublishedArticles>>;
}) {
  return (
    <section className="bg-off-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <ul className="grid gap-10 sm:grid-cols-2">
          {articles.map((a) => {
            const title = locale === "pt" ? a.title_pt : a.title_en;
            const excerpt = locale === "pt" ? a.excerpt_pt : a.excerpt_en;
            const slug = locale === "pt" ? a.slug_pt : a.slug_en;
            return (
              <li key={a.id}>
                <Link href={`/${locale}/articles/${slug}`} className="group block">
                  {a.hero_image_url && (
                    <img
                      src={a.hero_image_url}
                      alt={
                        (locale === "pt" ? a.hero_image_alt_pt : a.hero_image_alt_en) ?? ""
                      }
                      className="aspect-[16/9] w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-cyan">
                    {t(locale, `categories.${a.category}`)}
                  </p>
                  <h2 className="mt-2 font-serif text-2xl text-navy group-hover:underline">
                    {title}
                  </h2>
                  <p className="mt-2 text-gray-600">{excerpt}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

