import { NextRequest, NextResponse } from "next/server";

// Auth on every admin route. Two ways to pass:
//   1. Valid SSO cookie (i10_admin) — set when you successfully Basic-Auth at
//      ANY admin on this host. Lets you log in once at /admin and roam.
//   2. Basic Auth with ADMIN_PASSWORD — used on first visit and as fallback
//      if cookie expired/missing.
//
// On a successful Basic Auth, this middleware ALSO sets the SSO cookie so the
// next request (and any cross-app navigation under www.institutoi10.com.br)
// passes through without prompting.

const COOKIE_NAME = "i10_admin";
const SESSION_TTL_SECS = 8 * 60 * 60; // 8 hours
const REALM = "Instituto i10 Admin";

async function hmacHex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function b64urlEncode(s: string): string {
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): string {
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

async function isCookieValid(token: string, secret: string): Promise<boolean> {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;
  const expected = await hmacHex(b64, secret);
  // Constant-time-ish: both same length here so plain compare is fine
  if (sig !== expected) return false;
  try {
    const payload = JSON.parse(b64urlDecode(b64)) as { exp?: number };
    return typeof payload.exp === "number" && Date.now() / 1000 < payload.exp;
  } catch {
    return false;
  }
}

async function makeCookieToken(secret: string): Promise<string> {
  const payload = JSON.stringify({
    u: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECS,
  });
  const b64 = b64urlEncode(payload);
  const sig = await hmacHex(b64, secret);
  return `${b64}.${sig}`;
}

function isAdminPath(path: string): boolean {
  // Cover with-and-without basePath since req.nextUrl.pathname can differ on
  // Vercel between direct hits and rewrite paths.
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/admin-hub" ||
    path.startsWith("/admin-hub/") ||
    path === "/api/admin" ||
    path.startsWith("/api/admin/") ||
    path === "/insights/admin" ||
    path.startsWith("/insights/admin/") ||
    path === "/insights/admin-hub" ||
    path.startsWith("/insights/admin-hub/") ||
    path === "/insights/api/admin" ||
    path.startsWith("/insights/api/admin/")
  );
}

export async function middleware(req: NextRequest) {
  if (!isAdminPath(req.nextUrl.pathname)) return NextResponse.next();

  const expected = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!expected || !sessionSecret) {
    return new NextResponse(
      "ADMIN_PASSWORD or ADMIN_SESSION_SECRET not configured",
      { status: 500 },
    );
  }

  // 1. Try SSO cookie
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && (await isCookieValid(cookie, sessionSecret))) {
    return NextResponse.next();
  }

  // 2. Try Basic Auth
  const auth = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme === "Basic" && encoded) {
    try {
      const decoded = atob(encoded);
      const [, pwd] = decoded.split(":");
      if (pwd === expected) {
        // Auth OK — pass through AND set cookie so the next hop is seamless.
        const token = await makeCookieToken(sessionSecret);
        const res = NextResponse.next();
        res.cookies.set(COOKIE_NAME, token, {
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: SESSION_TTL_SECS,
        });
        return res;
      }
    } catch {}
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}"` },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/newsletter|api/webhooks|api/cron|subscribe|unsubscribe).*)",
  ],
};
