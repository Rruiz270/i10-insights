import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let reason = "";
  try {
    const body = (await req.json()) as { reason?: string };
    reason = String(body?.reason ?? "");
  } catch {}

  const sql = neon(process.env.DATABASE_URL!);
  const updated = await sql`
    UPDATE insights.drafts
    SET status = 'rejected', rejection_reason = ${reason || null}
    WHERE id = ${id} AND status = 'pending'
    RETURNING id
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: "draft_not_found_or_not_pending" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
