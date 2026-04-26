import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { buildConfirmEmail, sendEmail } from "@/lib/resend";
import { isLocale, SITE_URL } from "@/lib/i18n";

export const runtime = "nodejs";

const CONSENT_TEXT_VERSION = "v1";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const email = String(data.email ?? "").trim().toLowerCase();
  const locale = String(data.locale ?? "pt");
  const consent = data.consent === true;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);

  // Audit metadata for LGPD trail
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;
  const token = randomBytes(24).toString("hex");

  // Idempotent insert. If already exists and confirmed, we silently treat as success
  // (don't reveal that an email is or isn't on the list — privacy + security).
  const existing = await sql`
    SELECT id, status FROM insights.subscribers WHERE email = ${email} LIMIT 1
  `;

  if (existing.length === 0) {
    await sql`
      INSERT INTO insights.subscribers (
        email, locale, status, confirmation_token,
        signup_ip, signup_user_agent, consent_text_version
      ) VALUES (
        ${email}, ${locale}, 'pending_confirmation', ${token},
        ${ip}::inet, ${userAgent}, ${CONSENT_TEXT_VERSION}
      )
    `;
  } else if (existing[0].status === "pending_confirmation") {
    // Refresh token for re-send
    await sql`
      UPDATE insights.subscribers
      SET confirmation_token = ${token}
      WHERE id = ${existing[0].id}
    `;
  } else if (existing[0].status === "confirmed") {
    // Already confirmed — no-op response
    return NextResponse.json({ ok: true, status: "already_confirmed" });
  } else if (existing[0].status === "unsubscribed") {
    // Re-opt-in: reset token and pending state
    await sql`
      UPDATE insights.subscribers
      SET status = 'pending_confirmation', confirmation_token = ${token},
          unsubscribed_at = NULL, signup_ip = ${ip}::inet,
          signup_user_agent = ${userAgent},
          consent_text_version = ${CONSENT_TEXT_VERSION}
      WHERE id = ${existing[0].id}
    `;
  }

  const confirmUrl = `${SITE_URL}/api/newsletter/confirm?token=${token}&locale=${locale}`;
  const email_content = buildConfirmEmail({ locale, confirmUrl });
  const sent = await sendEmail({
    to: email,
    subject: email_content.subject,
    html: email_content.html,
    text: email_content.text,
  });

  // Log to email_log regardless (for LGPD audit)
  await sql`
    INSERT INTO insights.email_log (subscriber_id, email, kind, subject, resend_id)
    SELECT id, ${email}, 'confirmation', ${email_content.subject}, ${sent.id ?? null}
    FROM insights.subscribers WHERE email = ${email}
  `;

  // Surface the confirm URL only when Resend is intentionally disabled in dev
  // (so a developer can click through). Never expose in production.
  const devConfirmUrl =
    sent.reason === "no-api-key" && process.env.NODE_ENV !== "production"
      ? confirmUrl
      : undefined;

  return NextResponse.json({
    ok: true,
    status: "pending_confirmation",
    devConfirmUrl,
  });
}
