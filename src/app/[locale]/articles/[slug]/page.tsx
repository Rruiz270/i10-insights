import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, t, SITE_URL, type Locale } from "@/lib/i18n";
import { getArticleBySlug, getAllArticleSlugs, type Article } from "@/lib/db";

export const revalidate = 300;

export async function generateStaticParams() {
  const rows = await getAllArticleSlugs();
  return rows.flatMap((r) => [
    { locale: "pt", slug: r.slug_pt },
    { locale: "en", slug: r.slug_en },
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getArticleBySlug(locale, slug);
  if (!article) return {};
  const title = locale === "pt" ? article.title_pt : article.title_en;
  const description = locale === "pt" ? article.excerpt_pt : article.excerpt_en;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/insights/${locale}/articles/${slug}`,
      languages: {
        "pt-BR": `${SITE_URL}/insights/pt/articles/${article.slug_pt}`,
        "en-US": `${SITE_URL}/insights/en/articles/${article.slug_en}`,
      },
    },
    openGraph: {
      type: "article",
      title,
      description,
      images: article.hero_image_url ? [article.hero_image_url] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const article = await getArticleBySlug(locale, slug);
  if (!article) notFound();

  const title = locale === "pt" ? article.title_pt : article.title_en;
  const body = locale === "pt" ? article.body_pt : article.body_en;

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <NewsArticleSchema article={article} locale={locale} />
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
        {t(locale, `categories.${article.category}`)}
      </p>
      <h1 className="mt-3 font-serif text-3xl leading-tight text-navy sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-gray-500">
        {new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
          dateStyle: "long",
        }).format(new Date(article.published_at))}
      </p>
      {article.video_url ? (
        <video
          src={article.video_url}
          poster={article.hero_image_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="mt-8 aspect-[16/9] w-full rounded-lg bg-black"
        />
      ) : article.hero_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.hero_image_url}
          alt={
            (locale === "pt"
              ? article.hero_image_alt_pt
              : article.hero_image_alt_en) ?? ""
          }
          className="mt-8 aspect-[16/9] w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="mt-8 text-gray-800 leading-7">
        {body.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="mt-5">
            {para}
          </p>
        ))}
      </div>
      {article.citations.length > 0 && <Citations article={article} />}
    </article>
  );
}

function Citations({ article }: { article: Article }) {
  return (
    <section className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan">
        Fontes / Sources
      </h2>
      <ol className="mt-4 list-decimal pl-5 text-sm text-gray-700">
        {article.citations.map((c, i) => (
          <li key={i} className="mt-2">
            <a
              href={c.url}
              target="_blank"
              rel="noopener nofollow"
              className="text-navy underline hover:text-cyan"
            >
              {c.title}
            </a>
            {c.publisher && (
              <span className="ml-2 text-gray-500">— {c.publisher}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function NewsArticleSchema({
  article,
  locale,
}: {
  article: Article;
  locale: Locale;
}) {
  const title = locale === "pt" ? article.title_pt : article.title_en;
  const description = locale === "pt" ? article.excerpt_pt : article.excerpt_en;
  const slug = locale === "pt" ? article.slug_pt : article.slug_en;
  const json = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    datePublished: article.published_at,
    image: article.hero_image_url ? [article.hero_image_url] : undefined,
    author: { "@type": "Organization", name: "Instituto i10" },
    publisher: {
      "@type": "Organization",
      name: "Instituto i10",
      url: "https://www.institutoi10.com.br",
    },
    inLanguage: locale === "pt" ? "pt-BR" : "en-US",
    mainEntityOfPage: `${SITE_URL}/insights/${locale}/articles/${slug}`,
  };
  // Escape `<` to neutralize `</script>` if any text field contains it (defense in depth).
  const safe = JSON.stringify(json).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
