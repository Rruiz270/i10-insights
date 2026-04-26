// Gmail SMTP via nodemailer — same setup as BNCC-COMPUTACAO so we reuse the
// existing GMAIL_USER + GMAIL_APP_PASSWORD already provisioned by Vercel.

import nodemailer, { type Transporter } from "nodemailer";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SendResult {
  ok: boolean;
  id?: string;
  reason?: string;
}

let cached: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cached) return cached;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  cached = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cached;
}

function getFrom(): string {
  // Always send From: the authenticated Gmail user. Matches BNCC-COMPUTACAO.
  // We deliberately ignore EMAIL_FROM here because it's a stale Resend default
  // ("onboarding@resend.dev") in the shared Vercel env — authenticating as
  // institutoi10.org@gmail.com but claiming From: resend.dev causes Gmail to
  // either reject or have the recipient spam-filter aggressively (SPF/DMARC fail).
  const user = process.env.GMAIL_USER ?? "noreply@institutoi10.com.br";
  return `i10 Insights <${user}>`;
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[email disabled — GMAIL_* not set]");
    console.log(`  to:      ${args.to}`);
    console.log(`  subject: ${args.subject}`);
    console.log(`  text:\n${args.text}`);
    return { ok: false, reason: "no-smtp-config" };
  }
  try {
    const info = await transporter.sendMail({
      from: getFrom(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    console.error("email send error:", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ── Branded layout shared with BNCC-COMPUTACAO so all i10 emails look alike ──
export function wrapEmailLayout(bodyHtml: string, locale: "pt" | "en" = "pt"): string {
  const tagline =
    locale === "pt"
      ? "Orquestrando o Futuro da Educação Pública"
      : "Orchestrating the Future of Public Education";
  return `<!DOCTYPE html>
<html lang="${locale === "pt" ? "pt-BR" : "en-US"}">
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
      <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;font-style:italic;">${tagline}</p>
      <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">© ${new Date().getFullYear()} Instituto i10 · institutoi10.com.br</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export function buildConfirmEmail(args: {
  locale: "pt" | "en";
  confirmUrl: string;
}): { subject: string; html: string; text: string } {
  if (args.locale === "pt") {
    const body = `
      <h2 style="color:#0A2463;font-size:22px;margin:0 0 8px;">Confirme sua inscrição</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Obrigado por se cadastrar no <strong>i10 Insights</strong> — análise diária sobre IA na educação brasileira. Para começar a receber, confirme sua inscrição abaixo (exigido pela LGPD):
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${args.confirmUrl}" style="display:inline-block;background:#00E5A0;color:#061840;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Confirmar inscrição
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
        Se você não solicitou esta inscrição, ignore este e-mail — nenhum dado seu entra na nossa base sem confirmação.
      </p>`;
    return {
      subject: "Confirme sua inscrição — i10 Insights",
      text:
        `Olá!\n\nObrigado por se cadastrar no i10 Insights.\n\n` +
        `Para confirmar sua inscrição (exigido pela LGPD), acesse:\n${args.confirmUrl}\n\n` +
        `Se você não solicitou esta inscrição, ignore este e-mail.\n\n— Instituto i10`,
      html: wrapEmailLayout(body, "pt"),
    };
  }
  const body = `
      <h2 style="color:#0A2463;font-size:22px;margin:0 0 8px;">Confirm your subscription</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Thanks for signing up for <strong>i10 Insights</strong> — daily analysis on AI in Brazilian education. To start receiving, please confirm below (required by LGPD):
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${args.confirmUrl}" style="display:inline-block;background:#00E5A0;color:#061840;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Confirm subscription
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
        If you did not request this subscription, please ignore this email — no data of yours enters our list without confirmation.
      </p>`;
  return {
    subject: "Confirm your subscription — i10 Insights",
    text:
      `Hello!\n\nThanks for signing up for i10 Insights.\n\n` +
      `To confirm your subscription (required by LGPD), open:\n${args.confirmUrl}\n\n` +
      `If you did not request this, please ignore this email.\n\n— Instituto i10`,
    html: wrapEmailLayout(body, "en"),
  };
}
