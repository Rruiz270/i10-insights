import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { buildDailyBrief } from "@/lib/manus-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Record every reached run so failures surface in the admin instead of vanishing.
// Logging must NEVER mask the real outcome, so it swallows its own errors.
async function logRun(
  status: "ok" | "error",
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      INSERT INTO insights.cron_log (job, status, detail)
      VALUES ('daily-brief', ${status}, ${JSON.stringify(detail)}::jsonb)
    `;
  } catch {
    /* observability is best-effort */
  }
}

// POST handler: Vercel Cron sends Authorization: Bearer ${CRON_SECRET}.
// We accept GET too (for manual trigger from a logged-in admin).
async function trigger(req: Request) {
  // 1. Auth — require either CRON_SECRET (Vercel Cron) or admin token (later)
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Build today's brief
  const { prompt, category } = buildDailyBrief();

  // 3. Fire the Manus task
  const KEY = process.env.MANUS_API_KEY;
  if (!KEY) {
    await logRun("error", { stage: "config", error: "MANUS_API_KEY missing" });
    return NextResponse.json({ error: "MANUS_API_KEY missing" }, { status: 500 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.institutoi10.com.br";
  const webhookUrl = `${siteUrl}/insights/api/webhooks/manus`;

  let r: Response;
  try {
    r = await fetch("https://api.manus.ai/v1/tasks", {
      method: "POST",
      headers: { API_KEY: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        mode: "agent",
        webhook_url: webhookUrl,
        metadata: {
          source: "i10-insights-daily-cron",
          target_category: category,
          target_date: new Date().toISOString().slice(0, 10),
        },
      }),
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "fetch failed";
    await logRun("error", { stage: "manus_fetch", category, error });
    return NextResponse.json({ error: "manus_fetch_failed", detail: error }, { status: 502 });
  }

  if (!r.ok) {
    const body = await r.text();
    await logRun("error", { stage: "manus_create", category, status: r.status, body: body.slice(0, 300) });
    return NextResponse.json(
      { error: "manus_create_failed", status: r.status, body: body.slice(0, 500) },
      { status: 502 },
    );
  }
  const task = (await r.json()) as { task_id?: string; id?: string };
  const taskId = task.task_id ?? task.id ?? null;
  await logRun("ok", { category, task_id: taskId, webhook_url: webhookUrl });
  return NextResponse.json({
    ok: true,
    task_id: taskId,
    category,
    webhook_url: webhookUrl,
  });
}

export const GET = trigger;
export const POST = trigger;
