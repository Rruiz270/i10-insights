/**
 * HMAC-SHA256 token utilities for subscribe / unsubscribe flows.
 * Uses crypto.subtle (same approach as middleware.ts's hmacHex).
 * Signs with ADMIN_SESSION_SECRET — already provisioned on Vercel.
 */

const BASE_PATH = "/insights";

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET not set");
  return s;
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function hmacHex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Subscribe tokens ────────────────────────────────────────────────
export async function generateSubscribeToken(
  email: string,
  source: string,
): Promise<string> {
  return hmacHex(`${email}|${source}`, getSecret());
}

export async function verifySubscribeToken(
  email: string,
  source: string,
  token: string,
): Promise<boolean> {
  const expected = await generateSubscribeToken(email, source);
  return expected === token;
}

// ── Unsubscribe tokens ──────────────────────────────────────────────
export async function generateUnsubscribeToken(
  email: string,
): Promise<string> {
  return hmacHex(`${email}|unsub`, getSecret());
}

export async function verifyUnsubscribeToken(
  email: string,
  token: string,
): Promise<boolean> {
  const expected = await generateUnsubscribeToken(email);
  return expected === token;
}

// ── URL builders ────────────────────────────────────────────────────
export async function buildSubscribeUrl(
  email: string,
  source: string,
): Promise<string> {
  const token = await generateSubscribeToken(email, source);
  const params = new URLSearchParams({ email, token, source });
  return `${getSiteUrl()}${BASE_PATH}/subscribe?${params.toString()}`;
}

export async function buildUnsubscribeUrl(email: string): Promise<string> {
  const token = await generateUnsubscribeToken(email);
  const params = new URLSearchParams({ email, token });
  return `${getSiteUrl()}${BASE_PATH}/unsubscribe?${params.toString()}`;
}
