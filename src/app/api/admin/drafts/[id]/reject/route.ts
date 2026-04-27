import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { buildDailyBrief } from "@/lib/manus-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.institutoi10.com.br";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let reason = "";
  let regenerate = false;
  let category = "";
  try {
    const body = (await req.json()) as {
      reason?: string;
      regenerate?: boolean;
      category?: string;
    };
    reason = String(body?.reason ?? "");
    regenerate = body?.regenerate === true;
    category = String(body?.category ?? "");
  } catch {}

  const sql = neon(process.env.DATABASE_URL!);

  const drafts = (await sql`
    SELECT id, title_pt, body_pt, hero_image_url, category, manus_task_id
    FROM insights.drafts
    WHERE id = ${id} AND status = 'pending'
    LIMIT 1
  `) as Array<Record<string, unknown>>;

  if (drafts.length === 0) {
    return NextResponse.json(
      { error: "draft_not_found_or_not_pending" },
      { status: 404 },
    );
  }

  const draft = drafts[0];

  await sql`
    UPDATE insights.drafts
    SET status = 'rejected', rejection_reason = ${reason || null}
    WHERE id = ${id}
  `;

  if (!regenerate) {
    return NextResponse.json({ ok: true });
  }

  const KEY = process.env.MANUS_API_KEY;
  if (!KEY) {
    return NextResponse.json({
      ok: true,
      regenerate_error: "MANUS_API_KEY missing",
    });
  }

  const draftCategory = category || String(draft.category);
  const { prompt: baseBrief } = buildDailyBrief();

  const revisionPrompt = `# CONTEXT — REVISION REQUEST

This is a REVISION of a previously rejected draft. The editor reviewed the article and wants changes.

## ORIGINAL DRAFT THAT WAS REJECTED
Title: ${String(draft.title_pt)}
Category: ${draftCategory}
Hero image URL: ${String(draft.hero_image_url ?? "none")}

## EDITOR FEEDBACK — YOU MUST ADDRESS ALL OF THESE:
${reason}

## INSTRUCTIONS
1. Generate a NEW version of the article in the SAME category (${draftCategory})
2. Address ALL the editor's feedback above
3. If the feedback mentions the image, generate a completely new hero image
4. Keep the same topic/angle but improve based on the feedback
5. Follow the exact same output JSON format as the original brief

---

${baseBrief}`;

  const webhookUrl = `${SITE_URL}/insights/api/webhooks/manus`;
  const r = await fetch("https://api.manus.ai/v1/tasks", {
    method: "POST",
    headers: { API_KEY: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: revisionPrompt,
      mode: "agent",
      webhook_url: webhookUrl,
      metadata: {
        source: "i10-insights-revision",
        original_draft_id: id,
        target_category: draftCategory,
        target_date: new Date().toISOString().slice(0, 10),
        revision_reason: reason,
      },
    }),
  });

  if (!r.ok) {
    const body = await r.text();
    return NextResponse.json({
      ok: true,
      rejected: true,
      regenerate_error: `manus_create_failed: ${r.status} ${body.slice(0, 200)}`,
    });
  }

  const task = (await r.json()) as { task_id?: string; id?: string };
  return NextResponse.json({
    ok: true,
    rejected: true,
    regenerated: true,
    new_task_id: task.task_id ?? task.id,
    webhook_url: webhookUrl,
  });
}
