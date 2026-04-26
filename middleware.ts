import { NextRequest, NextResponse } from "next/server";

// Basic auth on /admin/* and /api/admin/*. The plaintext password lives in
// ADMIN_PASSWORD env (see .env.local). Cron and webhook routes are NOT
// protected here — they have their own auth (CRON_SECRET, Manus key re-fetch).

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;
  const needsAuth =
    path.startsWith("/admin") || path.startsWith("/api/admin");
  if (!needsAuth) return NextResponse.next();

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return new NextResponse("ADMIN_PASSWORD not configured", { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme === "Basic" && encoded) {
    try {
      const decoded = atob(encoded);
      const [, pwd] = decoded.split(":");
      if (pwd === expected) return NextResponse.next();
    } catch {}
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="i10 Insights Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
