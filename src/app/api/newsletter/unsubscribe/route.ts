import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyUnsubscribeToken } from "@/lib/tokens";

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

  if (!email || !token) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const valid = await verifyUnsubscribeToken(email, token);
  if (!valid) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);

  await sql`
    UPDATE insights.subscribers
    SET status = 'unsubscribed', unsubscribed_at = NOW()
    WHERE email = ${email} AND status != 'unsubscribed'
  `;

  // Log to email_log
  await sql`
    INSERT INTO insights.email_log (subscriber_id, email, kind, subject)
    SELECT id, ${email}, 'unsubscribe', 'Unsubscribed via link'
    FROM insights.subscribers WHERE email = ${email}
  `;

  return NextResponse.json({ ok: true });
}
