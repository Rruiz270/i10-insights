import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, t, SITE_URL, type Locale } from "@/lib/i18n";
import {
  getArticleBySlug,
  getAllArticleSlugs,
  getPublishedArticles,
  type Article,
} from "@/lib/db";
import { NewsletterForm } from "@/components/NewsletterForm";

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
  const description =
    locale === "pt" ? article.excerpt_pt : article.excerpt_en;
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

const CATEGORY_ACCENT: Record<string, string> = {
  politica: "from-cyan to-cyan-light",
  sala_de_aula: "from-green to-green-dark",
  pesquisa: "from-navy to-cyan",
  ferramentas: "from-cyan to-green",
  etica: "from-navy to-navy-light",
};

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
  const readingTimeMin = Math.max(
    1,
    Math.round(body.split(/\s+/).length / 220),
  );

  const all = await getPublishedArticles(20);
  const related = all
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  const blocks = parseMarkdownBlocks(body);

  return (
    <>
      <NewsArticleSchema article={article} locale={locale} />

      <section className="relative isolate overflow-hidden bg-navy-dark text-white">
        {article.hero_image_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.hero_image_url}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-navy-dark/40 via-navy-dark/70 to-navy-dark"
            />
          </>
        )}
        <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
          <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] uppercase">
            <span
              className={`bg-gradient-to-r ${CATEGORY_ACCENT[article.category] ?? "from-cyan to-green"} bg-clip-text text-transparent`}
            >
              {t(locale, `categories.${article.category}`)}
            </span>
            <span className="h-px w-8 bg-white/30" />
            <span className="text-white/60">
              {new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
                dateStyle: "long",
              }).format(new Date(article.published_at))}
            </span>
          </div>
          <h1 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl font-serif text-lg italic text-white/80 sm:text-xl">
            {locale === "pt" ? article.excerpt_pt : article.excerpt_en}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs uppercase tracking-wider text-white/60">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green" />
              Instituto i10
            </span>
            <span>·</span>
            <span>{readingTimeMin} min</span>
          </div>
        </div>
      </section>

      {article.video_url && (
        <section className="bg-off-white py-10">
          <div className="mx-auto max-w-4xl px-6">
            <video
              src={article.video_url}
              poster={article.hero_image_url ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="aspect-[16/9] w-full rounded-xl bg-black shadow-2xl ring-1 ring-navy/10"
            />
          </div>
        </section>
      )}

      <article className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-12">
            <div className="min-w-0 max-w-3xl">
              <KeyInsight blocks={blocks} locale={locale} />
              <Body blocks={blocks} />
              {article.citations.length > 0 && <Citations article={article} />}
            </div>
            <aside className="hidden lg:block">
              <TocSidebar
                headings={blocks
                  .filter((b): b is Extract<Block, { kind: "h2" }> => b.kind === "h2")
                  .map((h) => ({ text: h.text, anchor: h.anchor }))}
                locale={locale}
              />
            </aside>
          </div>
        </div>

        <section className="border-y border-gray-200 bg-off-white">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
              Newsletter
            </p>
            <h2 className="mt-3 font-serif text-2xl text-navy sm:text-3xl">
              {locale === "pt"
                ? "Receba a próxima análise direto no seu e-mail."
                : "Get the next analysis straight to your inbox."}
            </h2>
            <NewsletterForm locale={locale} />
          </div>
        </section>

        {related.length > 0 && <Related related={related} locale={locale} />}
      </article>
    </>
  );
}

type Block =
  | { kind: "h2"; text: string; anchor: string }
  | { kind: "p"; text: string; isStat?: boolean }
  | { kind: "quote"; text: string }
  | { kind: "image"; url: string; alt: string }
  | { kind: "ol"; items: string[] }
  | { kind: "ul"; items: string[] };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const OL_ITEM_RE = /^\d+\.\s+(.+)$/;
const UL_ITEM_RE = /^[-*]\s+(.+)$/;

function parseMarkdownBlocks(md: string): Block[] {
  const lines = md.split(/\n+/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i].trim();
    if (!ln) {
      i++;
      continue;
    }
    // Image on its own line
    const im = ln.match(IMAGE_LINE_RE);
    if (im) {
      blocks.push({ kind: "image", alt: im[1], url: im[2] });
      i++;
      continue;
    }
    if (ln.startsWith("## ")) {
      const text = ln.slice(3).trim();
      blocks.push({ kind: "h2", text, anchor: slugify(text) });
      i++;
      continue;
    }
    if (ln.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        buf.push(lines[i].trim().slice(2).trim());
        i++;
      }
      blocks.push({ kind: "quote", text: buf.join(" ") });
      continue;
    }
    // Ordered list (consecutive `1. ...`, `2. ...` lines)
    if (OL_ITEM_RE.test(ln)) {
      const items: string[] = [];
      while (i < lines.length && OL_ITEM_RE.test(lines[i].trim())) {
        items.push(lines[i].trim().match(OL_ITEM_RE)![1]);
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    // Unordered list
    if (UL_ITEM_RE.test(ln)) {
      const items: string[] = [];
      while (i < lines.length && UL_ITEM_RE.test(lines[i].trim())) {
        items.push(lines[i].trim().match(UL_ITEM_RE)![1]);
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    // Paragraph — collect until next-block delimiter
    const buf: string[] = [ln];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        next.startsWith("## ") ||
        next.startsWith("> ") ||
        IMAGE_LINE_RE.test(next) ||
        OL_ITEM_RE.test(next) ||
        UL_ITEM_RE.test(next)
      ) {
        break;
      }
      buf.push(next);
      i++;
    }
    const text = buf.join(" ");
    const isStat = /\*\*\d+(?:[.,]\d+)?%\*\*/.test(text);
    blocks.push({ kind: "p", text, isStat });
  }
  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let key = 0;
  const linkSegments: Array<{ text: string; href?: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(text))) {
    if (m.index > lastIndex)
      linkSegments.push({ text: text.slice(lastIndex, m.index) });
    linkSegments.push({ text: m[1], href: m[2] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length)
    linkSegments.push({ text: text.slice(lastIndex) });

  for (const seg of linkSegments) {
    const boldRe = /\*\*([^*]+)\*\*/g;
    const subParts: React.ReactNode[] = [];
    let subLast = 0;
    let bm: RegExpExecArray | null;
    while ((bm = boldRe.exec(seg.text))) {
      if (bm.index > subLast)
        subParts.push(seg.text.slice(subLast, bm.index));
      subParts.push(
        <strong key={`b${key++}`} className="font-semibold text-navy">
          {bm[1]}
        </strong>,
      );
      subLast = bm.index + bm[0].length;
    }
    if (subLast < seg.text.length) subParts.push(seg.text.slice(subLast));
    if (seg.href) {
      parts.push(
        <a
          key={`a${key++}`}
          href={seg.href}
          target="_blank"
          rel="noopener nofollow"
          className="text-navy underline decoration-cyan decoration-2 underline-offset-2 hover:text-cyan"
        >
          {subParts}
        </a>,
      );
    } else {
      parts.push(<span key={`s${key++}`}>{subParts}</span>);
    }
  }
  return parts;
}

function Body({ blocks }: { blocks: Block[] }) {
  let firstParaShown = false;
  let h2Index = 0;
  return (
    <div className="text-gray-800 leading-[1.8]">
      {blocks.map((b, i) => {
        if (b.kind === "h2") {
          h2Index++;
          const num = String(h2Index).padStart(2, "0");
          return (
            <h2
              key={i}
              id={b.anchor}
              className="mt-16 mb-6 flex items-baseline gap-4 font-serif text-2xl text-navy scroll-mt-20 sm:text-3xl"
            >
              <span
                aria-hidden
                className="font-sans text-sm font-bold tracking-widest text-cyan"
              >
                {num}
              </span>
              <span>{b.text}</span>
            </h2>
          );
        }
        if (b.kind === "quote") {
          return (
            <blockquote
              key={i}
              className="my-10 border-l-4 border-cyan bg-off-white px-6 py-5 font-serif text-xl italic text-navy sm:text-2xl"
            >
              <span className="select-none text-3xl leading-none text-cyan">
                {"“"}
              </span>
              <span className="ml-1">{renderInline(b.text)}</span>
            </blockquote>
          );
        }
        if (b.kind === "image") {
          return (
            <figure key={i} className="my-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.url}
                alt={b.alt}
                className="w-full rounded-lg ring-1 ring-gray-200"
                loading="lazy"
              />
              {b.alt && (
                <figcaption className="mt-3 text-center text-sm italic text-gray-500">
                  {b.alt}
                </figcaption>
              )}
            </figure>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={i} className="my-8 space-y-3">
              {b.items.map((it, j) => (
                <li
                  key={j}
                  className="flex gap-4 border-l-2 border-gray-200 pl-4"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex-shrink-0 font-serif text-2xl font-semibold text-cyan"
                  >
                    {String(j + 1).padStart(2, "0")}
                  </span>
                  <span className="text-base sm:text-lg">{renderInline(it)}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i} className="my-6 space-y-2">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-3 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan"
                  />
                  <span className="text-base sm:text-lg">{renderInline(it)}</span>
                </li>
              ))}
            </ul>
          );
        }
        const isFirst = !firstParaShown;
        if (isFirst) firstParaShown = true;
        if (isFirst) {
          return (
            <p
              key={i}
              className="mt-2 text-lg first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.85] first-letter:text-navy"
            >
              {renderInline(b.text)}
            </p>
          );
        }
        if (b.isStat) {
          return (
            <p
              key={i}
              className="my-6 border-l-4 border-green bg-green-pale/40 px-5 py-4 text-lg text-navy"
            >
              {renderInline(b.text)}
            </p>
          );
        }
        return (
          <p key={i} className="mt-5 text-base sm:text-lg">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

function KeyInsight({
  blocks,
  locale,
}: {
  blocks: Block[];
  locale: Locale;
}) {
  const firstQuote = blocks.find(
    (b): b is Extract<Block, { kind: "quote" }> => b.kind === "quote",
  );
  if (!firstQuote) return null;
  return (
    <aside className="mb-12 rounded-xl bg-gradient-main p-8 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-pale">
        {locale === "pt" ? "Insight principal" : "Key insight"}
      </p>
      <p className="mt-3 font-serif text-xl leading-snug sm:text-2xl">
        {firstQuote.text}
      </p>
    </aside>
  );
}

function TocSidebar({
  headings,
  locale,
}: {
  headings: Array<{ text: string; anchor: string }>;
  locale: Locale;
}) {
  if (headings.length === 0) return null;
  return (
    <nav
      aria-label={locale === "pt" ? "Sumário" : "Table of contents"}
      className="sticky top-8"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
        {locale === "pt" ? "Sumário" : "On this page"}
      </p>
      <ol className="mt-4 space-y-3 border-l border-gray-200 pl-4">
        {headings.map((h, i) => (
          <li key={h.anchor} className="text-sm">
            <a
              href={`#${h.anchor}`}
              className="block text-gray-600 hover:text-navy"
            >
              <span className="font-mono text-xs text-cyan">
                {String(i + 1).padStart(2, "0")}
              </span>{" "}
              <span>{h.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Citations({ article }: { article: Article }) {
  return (
    <section className="mt-16 border-t border-gray-200 pt-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
        Fontes / Sources
      </p>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {article.citations.map((c, i) => (
          <li
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-cyan"
          >
            <div className="flex items-start gap-3">
              <span className="font-serif text-2xl text-cyan/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="block font-serif text-base text-navy hover:underline"
                >
                  {c.title}
                </a>
                {c.publisher && (
                  <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">
                    {c.publisher}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Related({
  related,
  locale,
}: {
  related: Article[];
  locale: Locale;
}) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
          {locale === "pt" ? "Continue lendo" : "Keep reading"}
        </p>
        <h2 className="mt-3 font-serif text-2xl text-navy sm:text-3xl">
          {locale === "pt"
            ? `Mais sobre ${t(locale, `categories.${related[0].category}`)}`
            : `More on ${t(locale, `categories.${related[0].category}`)}`}
        </h2>
        <ul className="mt-8 grid gap-8 sm:grid-cols-3">
          {related.map((a) => {
            const title = locale === "pt" ? a.title_pt : a.title_en;
            const slug = locale === "pt" ? a.slug_pt : a.slug_en;
            return (
              <li key={a.id}>
                <Link href={`/${locale}/articles/${slug}`} className="group block">
                  {a.hero_image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.hero_image_url}
                      alt=""
                      className="aspect-[16/9] w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-cyan">
                    {new Intl.DateTimeFormat(
                      locale === "pt" ? "pt-BR" : "en-US",
                      { dateStyle: "medium" },
                    ).format(new Date(a.published_at))}
                  </p>
                  <h3 className="mt-1 font-serif text-lg text-navy group-hover:underline">
                    {title}
                  </h3>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
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
  const description =
    locale === "pt" ? article.excerpt_pt : article.excerpt_en;
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
  const safe = JSON.stringify(json).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
