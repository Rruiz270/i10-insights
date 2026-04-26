import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Forces re-render of the hub + all article pages + sitemap.
// Useful after direct DB inserts that bypassed the approve flow.
// Protected by /api/admin Basic Auth (see middleware.ts).
export async function POST() {
  revalidatePath("/pt", "layout");
  revalidatePath("/en", "layout");
  revalidatePath("/sitemap.xml");

  // Touch every article so each ISR cache entry refreshes
  const sql = neon(process.env.DATABASE_URL!);
  const slugs = (await sql`SELECT slug_pt, slug_en FROM insights.articles`) as Array<{
    slug_pt: string;
    slug_en: string;
  }>;
  for (const s of slugs) {
    revalidatePath(`/pt/articles/${s.slug_pt}`);
    revalidatePath(`/en/articles/${s.slug_en}`);
  }
  return NextResponse.json({ ok: true, revalidated: slugs.length * 2 + 3 });
}

export const GET = POST;
