// Thin wrapper around Resend's REST API.
// Falls back to console.log in dev when RESEND_API_KEY is not set,
// so the signup flow works end-to-end without a real key.

const FROM = "i10 Insights <insights@institutoi10.com.br>";
// Until institutoi10.com.br is verified in Resend, sandbox sends will fail.
// We check at send-time and fall back to console logging, surfacing the link
// so a developer can complete confirmation manually during local testing.

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(args: SendArgs): Promise<{
  ok: boolean;
  id?: string;
  reason?: string;
}> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[resend disabled — no key]");
    console.log(`  to:      ${args.to}`);
    console.log(`  subject: ${args.subject}`);
    console.log(`  text:\n${args.text}`);
    return { ok: false, reason: "no-api-key" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("resend send failed:", res.status, body);
    return { ok: false, reason: `${res.status}: ${body.slice(0, 200)}` };
  }
  const json = (await res.json()) as { id: string };
  return { ok: true, id: json.id };
}

export function buildConfirmEmail(args: {
  locale: "pt" | "en";
  confirmUrl: string;
}): { subject: string; html: string; text: string } {
  if (args.locale === "pt") {
    return {
      subject: "Confirme sua inscrição no i10 Insights",
      text:
        `Olá!\n\nObrigado por se cadastrar no boletim do i10 Insights.\n\n` +
        `Para confirmar sua inscrição (exigido pela LGPD), acesse:\n` +
        `${args.confirmUrl}\n\n` +
        `Se você não solicitou esta inscrição, ignore este e-mail.\n\n` +
        `— Instituto i10`,
      html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0F172A">
<p style="font-size:14px;color:#64748B;letter-spacing:1px;text-transform:uppercase">i10 Insights</p>
<h1 style="font-size:24px;color:#0A2463">Confirme sua inscrição</h1>
<p>Obrigado por se cadastrar. Para receber o boletim diário, confirme abaixo (exigido pela LGPD):</p>
<p><a href="${args.confirmUrl}" style="display:inline-block;background:#0A2463;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Confirmar inscrição</a></p>
<p style="font-size:13px;color:#64748B">Se você não solicitou esta inscrição, ignore este e-mail.</p>
</body></html>`,
    };
  }
  return {
    subject: "Confirm your i10 Insights subscription",
    text:
      `Hello!\n\nThanks for signing up for the i10 Insights newsletter.\n\n` +
      `To confirm your subscription (required by LGPD), open:\n` +
      `${args.confirmUrl}\n\n` +
      `If you did not request this subscription, please ignore this email.\n\n` +
      `— Instituto i10`,
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0F172A">
<p style="font-size:14px;color:#64748B;letter-spacing:1px;text-transform:uppercase">i10 Insights</p>
<h1 style="font-size:24px;color:#0A2463">Confirm your subscription</h1>
<p>Thanks for signing up. To receive the daily newsletter, please confirm (required by LGPD):</p>
<p><a href="${args.confirmUrl}" style="display:inline-block;background:#0A2463;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Confirm subscription</a></p>
<p style="font-size:13px;color:#64748B">If you did not request this, please ignore this email.</p>
</body></html>`,
  };
}
