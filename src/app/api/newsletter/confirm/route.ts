import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { isLocale } from "@/lib/i18n";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const locale = url.searchParams.get("locale") ?? "pt";
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    UPDATE insights.subscribers
    SET status = 'confirmed', confirmed_at = now(), confirmation_token = NULL
    WHERE confirmation_token = ${token} AND status = 'pending_confirmation'
    RETURNING id, email
  `;

  // Always redirect to a friendly thank-you page, regardless of token validity,
  // so we don't leak whether a token exists.
  return NextResponse.redirect(
    new URL(`/${locale}/obrigado`, url.origin),
    303,
  );
}
