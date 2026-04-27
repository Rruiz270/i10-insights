/**
 * Batch invitation script — fetches subscribers from BNCC Computação and sends
 * i10 Insights invite emails with one-click subscribe links.
 *
 * Usage: node --env-file=.env.local scripts/send-invite-batch.mjs
 *
 * Env vars required:
 *   DATABASE_URL, GMAIL_USER, GMAIL_APP_PASSWORD,
 *   ADMIN_SESSION_SECRET, NEXT_PUBLIC_SITE_URL
 */

import { neon } from "@neondatabase/serverless";
import nodemailer from "nodemailer";

// ── Config ──────────────────────────────────────────────────────────
const BNCC_API = "https://bncc-computacao.vercel.app/api/admin/subscribers";
const BNCC_TOKEN = "i10admin2026";
const DELAY_MS = 2000;
const SOURCE = "bncc-computacao";
const BASE_PATH = "/insights";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ── HMAC (same logic as src/lib/tokens.ts) ──────────────────────────
async function hmacHex(data, secret) {
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

async function generateSubscribeToken(email, source) {
  return hmacHex(`${email}|${source}`, process.env.ADMIN_SESSION_SECRET);
}

async function generateUnsubscribeToken(email) {
  return hmacHex(`${email}|unsub`, process.env.ADMIN_SESSION_SECRET);
}

async function buildSubscribeUrl(email, source) {
  const token = await generateSubscribeToken(email, source);
  const params = new URLSearchParams({ email, token, source });
  return `${SITE_URL}${BASE_PATH}/subscribe?${params.toString()}`;
}

async function buildUnsubscribeUrl(email) {
  const token = await generateUnsubscribeToken(email);
  const params = new URLSearchParams({ email, token });
  return `${SITE_URL}${BASE_PATH}/unsubscribe?${params.toString()}`;
}

// ── Email layout (mirrors src/lib/email.ts wrapEmailLayout) ─────────
function wrapEmailLayout(bodyHtml, unsubscribeUrl) {
  const unsubLine = unsubscribeUrl
    ? `<p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 8px;">
        <a href="${unsubscribeUrl}" style="color:rgba(255,255,255,0.5);text-decoration:underline;">
          Cancelar inscrição
        </a>
      </p>`
    : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#0A2463;border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
      <h1 style="color:#00E5A0;font-size:28px;margin:0 0 4px;font-weight:800;">i10</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;letter-spacing:1px;text-transform:uppercase;">Insights</p>
    </div>
    <div style="background:#ffffff;padding:32px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      ${bodyHtml}
    </div>
    <div style="background:#061840;border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;">
      ${unsubLine}
      <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;font-style:italic;">Orquestrando o Futuro da Educação Pública</p>
      <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">© ${new Date().getFullYear()} Instituto i10 · institutoi10.com.br</p>
    </div>
  </div>
</body>
</html>`.trim();
}

function buildInviteBody(name, subscribeUrl) {
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  return `
    <h2 style="color:#0A2463;font-size:22px;margin:0 0 12px;">${greeting}</h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Você se cadastrou para receber conteúdo sobre a <strong>BNCC de Computação</strong> — e esse interesse te coloca em uma posição privilegiada. Agora queremos te convidar para algo ainda mais atual.
    </p>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
      O <strong>i10 Insights</strong> é o boletim diário do Instituto i10 sobre <strong>inteligência artificial na educação brasileira</strong>. Todo dia útil você recebe uma análise curada: pesquisa, política pública, ferramentas e equidade — tudo baseado em evidências.
    </p>

    <div style="background:#f0fdf9;border-left:4px solid #00E5A0;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
      <p style="color:#0A2463;font-size:14px;font-weight:700;margin:0 0 6px;">Você sabia?</p>
      <p style="color:#475569;font-size:14px;line-height:1.5;margin:0;">
        <strong>80% dos estudantes</strong> já usam IA generativa, mas apenas <strong>6% dos professores</strong> têm diretrizes formais. O i10 Insights acompanha esse cenário para você.
      </p>
    </div>

    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Um clique e você já está inscrito — sem formulário, sem confirmação extra:
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${subscribeUrl}" style="display:inline-block;background:#00E5A0;color:#061840;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Quero receber o i10 Insights
      </a>
    </div>

    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
      É gratuito e você pode cancelar quando quiser. Seus dados são protegidos pela LGPD.
    </p>`;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  // Validate env
  for (const key of [
    "DATABASE_URL",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "ADMIN_SESSION_SECRET",
  ]) {
    if (!process.env[key]) {
      console.error(`Missing env var: ${key}`);
      process.exit(1);
    }
  }

  // 1. Fetch BNCC subscribers
  console.log("Fetching BNCC Computação subscriber list...");
  const res = await fetch(BNCC_API, {
    headers: { Authorization: `Bearer ${BNCC_TOKEN}` },
  });
  if (!res.ok) {
    console.error(`BNCC API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const bnccData = await res.json();
  // The API may return { subscribers: [...] } or just [...]
  const subscribers = Array.isArray(bnccData)
    ? bnccData
    : bnccData.subscribers ?? bnccData.data ?? [];

  console.log(`Found ${subscribers.length} BNCC subscribers.`);

  // 2. Check which ones already received invites
  const sql = neon(process.env.DATABASE_URL);

  const alreadySent = await sql`
    SELECT DISTINCT email FROM insights.email_log WHERE kind = 'invite'
  `;
  const sentSet = new Set(alreadySent.map((r) => r.email.toLowerCase()));
  console.log(`Already sent invites to ${sentSet.size} emails. Skipping those.`);

  // 3. Set up SMTP
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  const from = `i10 Insights <${process.env.GMAIL_USER}>`;

  // 4. Send invites
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < subscribers.length; i++) {
    const sub = subscribers[i];
    const email = (sub.email ?? "").trim().toLowerCase();
    const name = sub.name ?? sub.nome ?? "";

    if (!email || !email.includes("@")) {
      console.log(`[${i + 1}/${subscribers.length}] SKIP — invalid email: ${email || "(empty)"}`);
      skipped++;
      continue;
    }

    if (sentSet.has(email)) {
      console.log(`[${i + 1}/${subscribers.length}] SKIP — already sent: ${email}`);
      skipped++;
      continue;
    }

    try {
      const subscribeUrl = await buildSubscribeUrl(email, SOURCE);
      const unsubscribeUrl = await buildUnsubscribeUrl(email);
      const bodyHtml = buildInviteBody(name, subscribeUrl);
      const html = wrapEmailLayout(bodyHtml, unsubscribeUrl);
      const subject =
        "Você acompanha BNCC — agora acompanhe IA na Educação, todo dia útil";

      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html,
        text: `${name ? `Olá, ${name}!` : "Olá!"}\n\nVocê se cadastrou para receber conteúdo sobre a BNCC de Computação. Agora queremos te convidar para o i10 Insights — boletim diário sobre IA na educação brasileira.\n\n80% dos estudantes já usam IA generativa, mas apenas 6% dos professores têm diretrizes formais.\n\nInscreva-se com um clique: ${subscribeUrl}\n\nÉ gratuito e você pode cancelar quando quiser.\n\nCancelar inscrição: ${unsubscribeUrl}\n\n— Instituto i10`,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      // Log to email_log — find or create subscriber stub
      // We log with subscriber_id if they exist, otherwise just log the email
      const existing = await sql`
        SELECT id FROM insights.subscribers WHERE email = ${email} LIMIT 1
      `;
      const subscriberId = existing.length > 0 ? existing[0].id : null;

      await sql`
        INSERT INTO insights.email_log (subscriber_id, email, kind, subject, resend_id)
        VALUES (${subscriberId}, ${email}, 'invite', ${subject}, ${info.messageId ?? null})
      `;

      sent++;
      console.log(
        `[${i + 1}/${subscribers.length}] SENT — ${email} (messageId: ${info.messageId})`,
      );
    } catch (err) {
      errors++;
      console.error(
        `[${i + 1}/${subscribers.length}] ERROR — ${email}: ${err.message}`,
      );
    }

    // 2-second delay between sends
    if (i < subscribers.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log("\n=== Done ===");
  console.log(`Sent: ${sent} | Skipped: ${skipped} | Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
