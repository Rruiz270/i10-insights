import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifySubscribeToken } from "@/lib/tokens";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const email = String(data.email ?? "").trim().toLowerCase();
  const token = String(data.token ?? "");
  const source = String(data.source ?? "organic");

  if (!email || !token) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const valid = await verifySubscribeToken(email, source, token);
  if (!valid) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);

  // Check if subscriber already exists
  const existing = await sql`
    SELECT id, status FROM insights.subscribers WHERE email = ${email} LIMIT 1
  `;

  let status = "confirmed";

  if (existing.length === 0) {
    // New subscriber — insert as confirmed directly (quick-subscribe skips double-opt-in)
    await sql`
      INSERT INTO insights.subscribers (
        email, locale, status, source, confirmed_at, consent_text_version
      ) VALUES (
        ${email}, 'pt', 'confirmed', ${source}, NOW(), 'v1-invite'
      )
    `;
  } else if (existing[0].status === "confirmed") {
    status = "already_confirmed";
  } else if (existing[0].status === "pending_confirmation") {
    await sql`
      UPDATE insights.subscribers
      SET status = 'confirmed', confirmed_at = NOW(), source = ${source},
          consent_text_version = 'v1-invite'
      WHERE id = ${existing[0].id}
    `;
  } else if (existing[0].status === "unsubscribed") {
    // Re-confirm
    await sql`
      UPDATE insights.subscribers
      SET status = 'confirmed', confirmed_at = NOW(), unsubscribed_at = NULL,
          source = ${source}, consent_text_version = 'v1-invite'
      WHERE id = ${existing[0].id}
    `;
  }

  // Log to email_log
  if (status !== "already_confirmed") {
    await sql`
      INSERT INTO insights.email_log (subscriber_id, email, kind, subject)
      SELECT id, ${email}, 'quick-subscribe', 'Quick subscribe via invite link'
      FROM insights.subscribers WHERE email = ${email}
    `;
  }

  return NextResponse.json({ ok: true, status });
}
