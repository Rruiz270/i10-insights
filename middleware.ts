import { NextRequest, NextResponse } from "next/server";

// Basic auth on every admin route. We check the path inside the function
// (not just via matcher) so it works regardless of basePath behavior on
// Vercel + rewrites. The matcher is broad and the function decides.

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Match both with-and-without basePath since req.nextUrl.pathname behavior
  // can differ between Edge runtime and Vercel rewrites.
  const isAdmin =
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/api/admin" ||
    path.startsWith("/api/admin/") ||
    path === "/insights/admin" ||
    path.startsWith("/insights/admin/") ||
    path === "/insights/api/admin" ||
    path.startsWith("/insights/api/admin/");

  if (!isAdmin) return NextResponse.next();

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

// Run middleware on all paths so the function above sees them. The matcher
// excludes static assets and the public-facing newsletter API.
export const config = {
  matcher: [
    /*
     * Match every path except:
     * - _next/static, _next/image, favicon, robots.txt, sitemap.xml
     * - public newsletter routes (/api/newsletter/...)
     * - public webhook (/api/webhooks/...)
     * - public cron (/api/cron/... — has its own Bearer auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/newsletter|api/webhooks|api/cron).*)",
  ],
};
