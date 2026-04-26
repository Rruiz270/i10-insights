import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sql = neon(process.env.DATABASE_URL!);

  const drafts = await sql`
    SELECT * FROM insights.drafts WHERE id = ${id} AND status = 'pending' LIMIT 1
  `;
  if (drafts.length === 0) {
    return NextResponse.json({ error: "draft_not_found_or_not_pending" }, { status: 404 });
  }
  const d = drafts[0];

  // Insert into articles using draft.id so they share identity
  await sql`
    INSERT INTO insights.articles (
      id, draft_id, category,
      title_pt, title_en, slug_pt, slug_en,
      excerpt_pt, excerpt_en, body_pt, body_en,
      hero_image_url, hero_image_alt_pt, hero_image_alt_en,
      video_url, citations
    ) VALUES (
      ${d.id}, ${d.id}, ${d.category},
      ${d.title_pt}, ${d.title_en}, ${d.slug_pt}, ${d.slug_en},
      ${d.excerpt_pt}, ${d.excerpt_en}, ${d.body_pt}, ${d.body_en},
      ${d.hero_image_url}, ${d.hero_image_alt_pt}, ${d.hero_image_alt_en},
      ${d.video_url}, ${JSON.stringify(d.citations)}::jsonb
    )
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    UPDATE insights.drafts
    SET status = 'published', approved_at = now()
    WHERE id = ${id}
  `;

  // Re-render the public hub + sitemap
  revalidatePath("/pt", "layout");
  revalidatePath("/en", "layout");
  revalidatePath(`/pt/articles/${d.slug_pt}`);
  revalidatePath(`/en/articles/${d.slug_en}`);
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ ok: true });
}
