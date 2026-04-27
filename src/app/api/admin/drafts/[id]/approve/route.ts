import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";
import { sendEmail, wrapEmailLayout } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  politica: "Política & Equidade",
  sala_de_aula: "Sala de Aula",
  pesquisa: "Pesquisa",
  ferramentas: "Ferramentas & LLMs",
  etica: "Ética & Futuro",
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.institutoi10.com.br";

function buildDigestHtml(article: Record<string, unknown>): string {
  const categoryLabel = CATEGORY_LABELS[String(article.category)] ?? article.category;
  const articleUrl = `${SITE_URL}/insights/pt/articles/${article.slug_pt}`;
  const excerpt = String(article.excerpt_pt);
  const heroHtml = article.hero_image_url
    ? `<img src="${article.hero_image_url}" alt="${String(article.hero_image_alt_pt ?? "")}" style="width:100%;border-radius:8px;margin-bottom:20px;" />`
    : "";

  return `
    <p style="color:#00E5A0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">${categoryLabel}</p>
    <h2 style="color:#0A2463;font-size:22px;margin:0 0 12px;line-height:1.3;">${article.title_pt}</h2>
    ${heroHtml}
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">${excerpt}</p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${articleUrl}" style="display:inline-block;background:#00E5A0;color:#061840;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Ler artigo completo
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:0;">
      i10 Insights · Análise diária sobre IA na educação brasileira
    </p>`;
}

function buildDigestText(article: Record<string, unknown>): string {
  const categoryLabel = CATEGORY_LABELS[String(article.category)] ?? article.category;
  const articleUrl = `${SITE_URL}/insights/pt/articles/${article.slug_pt}`;
  return `${categoryLabel}\n\n${article.title_pt}\n\n${article.excerpt_pt}\n\nLeia o artigo completo: ${articleUrl}\n\n— i10 Insights`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendDigestToSubscribers(
  sql: any,
  article: Record<string, unknown>,
) {
  const subscribers = (await sql`
    SELECT id, email FROM insights.subscribers
    WHERE status = 'confirmed'
    ORDER BY created_at
  `) as Array<{ id: string; email: string }>;

  if (subscribers.length === 0) return { sent: 0, errors: 0 };

  const subject = `${article.title_pt} — i10 Insights`;
  let sent = 0;
  let errors = 0;

  for (const sub of subscribers) {
    try {
      const unsubUrl = await buildUnsubscribeUrl(sub.email);
      const html = wrapEmailLayout(buildDigestHtml(article), "pt", unsubUrl);
      const text =
        buildDigestText(article) + `\n\nCancelar inscrição: ${unsubUrl}`;

      await sendEmail({
        to: sub.email,
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      await sql`
        INSERT INTO insights.email_log (subscriber_id, email, kind, subject)
        VALUES (${sub.id}, ${sub.email}, 'digest', ${subject})
      `;

      await sql`
        UPDATE insights.subscribers SET last_email_sent_at = now()
        WHERE id = ${sub.id}
      `;

      sent++;
    } catch (err) {
      console.error(`[digest] Failed to send to ${sub.email}:`, err);
      errors++;
    }
  }

  return { sent, errors };
}

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
    return NextResponse.json(
      { error: "draft_not_found_or_not_pending" },
      { status: 404 },
    );
  }
  const d = drafts[0];

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

  revalidatePath("/pt", "layout");
  revalidatePath("/en", "layout");
  revalidatePath(`/pt/articles/${d.slug_pt}`);
  revalidatePath(`/en/articles/${d.slug_en}`);
  revalidatePath("/sitemap.xml");

  const emailResult = await sendDigestToSubscribers(sql, d as Record<string, unknown>);

  return NextResponse.json({
    ok: true,
    emails: emailResult,
  });
}
