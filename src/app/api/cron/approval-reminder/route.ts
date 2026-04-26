import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendEmail, wrapEmailLayout } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_TO = "raphael.ruiz@betteredu.com.br";

async function trigger(req: Request) {
  // Auth — Bearer CRON_SECRET (Vercel Cron)
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);

  // Drafts created today (UTC date) still pending. Today = same UTC day as
  // the cron's now() — at 16:00 UTC this means drafts since 00:00 UTC, which
  // covers the daily-brief cron that ran at 09:00 UTC the same day.
  const drafts = (await sql`
    SELECT id, title_pt, title_en, category, created_at,
           CASE WHEN banned_word_hits IS NULL THEN 0
                ELSE jsonb_array_length(banned_word_hits) END AS banned_count
    FROM insights.drafts
    WHERE status = 'pending'
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
    ORDER BY created_at DESC
  `) as Array<{
    id: string;
    title_pt: string;
    title_en: string;
    category: string;
    created_at: string;
    banned_count: number;
  }>;

  if (drafts.length === 0) {
    return NextResponse.json({
      ok: true,
      action: "no_pending_drafts_skipped",
      checked_at: new Date().toISOString(),
    });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.institutoi10.com.br";
  const adminUrl = `${siteUrl}/insights/admin/drafts`;

  // Build list HTML
  const itemsHtml = drafts
    .map((d) => {
      const warn =
        d.banned_count > 0
          ? `<span style="background:#fee2e2;color:#dc2626;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:6px">⚠ ${d.banned_count} banned</span>`
          : "";
      return `<li style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e2e8f0;list-style:none">
        <span style="display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#00B4D8;margin-bottom:4px">${d.category}${warn ? "" : ""}</span>${warn}
        <div style="font-family:Georgia,serif;font-size:16px;color:#0A2463;line-height:1.4;margin-top:4px"><a href="${siteUrl}/insights/admin/drafts/${d.id}" style="color:#0A2463;text-decoration:none">${escapeHtml(d.title_pt)}</a></div>
      </li>`;
    })
    .join("");

  const itemsText = drafts
    .map((d, i) => `  ${i + 1}. ${d.title_pt}\n     ${siteUrl}/insights/admin/drafts/${d.id}`)
    .join("\n\n");

  const bodyHtml = `
    <h2 style="color:#0A2463;font-size:22px;margin:0 0 8px">Drafts pendentes — ainda não aprovados</h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
      Já passou das <strong>13:00 BRT</strong> e há ${drafts.length === 1 ? "1 draft" : drafts.length + " drafts"} de hoje aguardando sua aprovação no i10 Insights.
      Sem aprovação, ${drafts.length === 1 ? "ele não será" : "eles não serão"} publicado${drafts.length === 1 ? "" : "s"} no site nem enviado${drafts.length === 1 ? "" : "s"} para os inscritos.
    </p>

    <ul style="padding:0;margin:0 0 24px">${itemsHtml}</ul>

    <div style="text-align:center;margin-bottom:24px">
      <a href="${adminUrl}" style="display:inline-block;background:#00E5A0;color:#061840;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none">
        Abrir admin e revisar
      </a>
    </div>

    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0">
      Você pode aprovar, rejeitar ou editar cada draft. Aprovados publicam imediatamente e disparam newsletter para os inscritos confirmados.
    </p>`;

  const sent = await sendEmail({
    to: REMINDER_TO,
    subject: `Aprovação pendente — ${drafts.length} draft${drafts.length === 1 ? "" : "s"} aguardando · i10 Insights`,
    html: wrapEmailLayout(bodyHtml, "pt"),
    text:
      `Drafts pendentes — i10 Insights\n\n` +
      `Há ${drafts.length} draft${drafts.length === 1 ? "" : "s"} aguardando sua aprovação:\n\n` +
      itemsText +
      `\n\nAbrir admin: ${adminUrl}\n`,
  });

  // Log to email_log for audit (subscriber_id NULL — internal email)
  await sql`
    INSERT INTO insights.email_log (subscriber_id, email, kind, subject, resend_id)
    VALUES (NULL, ${REMINDER_TO}, 'approval-reminder', ${"Aprovação pendente · i10 Insights"}, ${sent.id ?? null})
  `;

  return NextResponse.json({
    ok: true,
    action: "reminder_sent",
    drafts: drafts.length,
    email_to: REMINDER_TO,
    email_id: sent.id ?? null,
    email_ok: sent.ok,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const GET = trigger;
export const POST = trigger;
