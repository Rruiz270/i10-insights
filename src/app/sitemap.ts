import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/i18n";
import { getAllArticleSlugs } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllArticleSlugs();
  const now = new Date();

  const hubs: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/insights/pt`,
      lastModified: now,
      alternates: {
        languages: {
          "pt-BR": `${SITE_URL}/insights/pt`,
          "en-US": `${SITE_URL}/insights/en`,
        },
      },
    },
    {
      url: `${SITE_URL}/insights/en`,
      lastModified: now,
      alternates: {
        languages: {
          "pt-BR": `${SITE_URL}/insights/pt`,
          "en-US": `${SITE_URL}/insights/en`,
        },
      },
    },
  ];

  const articles: MetadataRoute.Sitemap = slugs.flatMap((s) => [
    {
      url: `${SITE_URL}/insights/pt/articles/${s.slug_pt}`,
      lastModified: now,
      alternates: {
        languages: {
          "pt-BR": `${SITE_URL}/insights/pt/articles/${s.slug_pt}`,
          "en-US": `${SITE_URL}/insights/en/articles/${s.slug_en}`,
        },
      },
    },
    {
      url: `${SITE_URL}/insights/en/articles/${s.slug_en}`,
      lastModified: now,
      alternates: {
        languages: {
          "pt-BR": `${SITE_URL}/insights/pt/articles/${s.slug_pt}`,
          "en-US": `${SITE_URL}/insights/en/articles/${s.slug_en}`,
        },
      },
    },
  ]);

  return [...hubs, ...articles];
}
