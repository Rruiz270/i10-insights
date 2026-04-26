import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

export type Category =
  | "politica"
  | "sala_de_aula"
  | "pesquisa"
  | "ferramentas"
  | "etica";

export interface Article {
  id: string;
  category: Category;
  published_at: string;
  title_pt: string;
  title_en: string;
  slug_pt: string;
  slug_en: string;
  excerpt_pt: string;
  excerpt_en: string;
  body_pt: string;
  body_en: string;
  hero_image_url: string | null;
  hero_image_alt_pt: string | null;
  hero_image_alt_en: string | null;
  citations: Array<{ url: string; title: string; publisher?: string }>;
}

export async function getPublishedArticles(limit = 20): Promise<Article[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, category, published_at,
           title_pt, title_en, slug_pt, slug_en,
           excerpt_pt, excerpt_en, body_pt, body_en,
           hero_image_url, hero_image_alt_pt, hero_image_alt_en, citations
    FROM insights.articles
    ORDER BY published_at DESC
    LIMIT ${limit}
  `;
  return rows as Article[];
}

export async function getArticleBySlug(
  locale: "pt" | "en",
  slug: string,
): Promise<Article | null> {
  const sql = getSql();
  const rows =
    locale === "pt"
      ? await sql`SELECT * FROM insights.articles WHERE slug_pt = ${slug} LIMIT 1`
      : await sql`SELECT * FROM insights.articles WHERE slug_en = ${slug} LIMIT 1`;
  return (rows[0] as Article | undefined) ?? null;
}

export async function getAllArticleSlugs(): Promise<
  Array<{ slug_pt: string; slug_en: string }>
> {
  const sql = getSql();
  const rows = await sql`SELECT slug_pt, slug_en FROM insights.articles`;
  return rows as Array<{ slug_pt: string; slug_en: string }>;
}
