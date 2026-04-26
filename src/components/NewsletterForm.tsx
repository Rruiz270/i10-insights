"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

interface Strings {
  cta: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  consentText: string;
  privacyLinkText: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  errors: {
    invalid_email: string;
    consent_required: string;
    network: string;
    fallback: string;
    devConfirm: string;
  };
}

const STRINGS: Record<Locale, Strings> = {
  pt: {
    cta: "Receber por e-mail",
    subtitle:
      "Boletim grátis, sem spam. Cancele quando quiser. Conforme a LGPD.",
    emailLabel: "Seu e-mail",
    emailPlaceholder: "voce@email.com",
    consentText:
      "Concordo em receber e-mails do i10 Insights e li a ",
    privacyLinkText: "política de privacidade",
    submit: "Quero receber",
    submitting: "Enviando...",
    successTitle: "Quase lá",
    successBody:
      "Enviamos um e-mail de confirmação. Clique no link para completar sua inscrição (exigido pela LGPD).",
    errors: {
      invalid_email: "Esse e-mail não parece válido.",
      consent_required: "Marque a caixa de consentimento para continuar.",
      network: "Não conseguimos enviar agora. Tente novamente em instantes.",
      fallback: "Algo deu errado. Tente novamente.",
      devConfirm:
        "Modo de desenvolvimento — Resend não configurado. Clique para confirmar:",
    },
  },
  en: {
    cta: "Get it by email",
    subtitle:
      "Free newsletter, no spam. Unsubscribe anytime. LGPD-compliant.",
    emailLabel: "Your email",
    emailPlaceholder: "you@email.com",
    consentText: "I agree to receive emails from i10 Insights and have read the ",
    privacyLinkText: "privacy policy",
    submit: "Subscribe",
    submitting: "Sending...",
    successTitle: "Almost there",
    successBody:
      "We sent you a confirmation email. Click the link to complete your subscription (required by LGPD).",
    errors: {
      invalid_email: "That email doesn't look valid.",
      consent_required: "Tick the consent box to continue.",
      network: "We couldn't send right now. Please try again shortly.",
      fallback: "Something went wrong. Please try again.",
      devConfirm:
        "Dev mode — Resend not configured. Click to confirm:",
    },
  },
};

export function NewsletterForm({ locale }: { locale: Locale }) {
  const s = STRINGS[locale];
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ devConfirmUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError(s.errors.consent_required);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, consent }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: keyof Strings["errors"];
        devConfirmUrl?: string;
      };
      if (!res.ok) {
        const key = json.error ?? "fallback";
        setError(s.errors[key as keyof Strings["errors"]] ?? s.errors.fallback);
        return;
      }
      setDone({ devConfirmUrl: json.devConfirmUrl });
    } catch {
      setError(s.errors.network);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-xl bg-white p-8 ring-1 ring-gray-200 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-dark">
          ✓
        </p>
        <p className="mt-2 font-serif text-2xl text-navy">{s.successTitle}</p>
        <p className="mt-2 text-sm text-gray-600">{s.successBody}</p>
        {done.devConfirmUrl && (
          <p className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
            <strong>{s.errors.devConfirm}</strong>
            <br />
            <a
              href={done.devConfirmUrl}
              className="break-all text-navy underline"
            >
              {done.devConfirmUrl}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-xl bg-white p-8 ring-1 ring-gray-200 text-left"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
        Newsletter
      </p>
      <p className="mt-3 font-serif text-2xl text-navy">{s.cta}</p>
      <p className="mt-2 text-sm text-gray-600">{s.subtitle}</p>
      <label className="mt-6 block">
        <span className="block text-sm font-medium text-gray-700">
          {s.emailLabel}
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={s.emailPlaceholder}
          autoComplete="email"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30"
        />
      </label>
      <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          {s.consentText}
          <Link
            href={`/${locale}/privacidade`}
            className="text-navy underline hover:text-cyan"
          >
            {s.privacyLinkText}
          </Link>
          .
        </span>
      </label>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-md bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-navy-dark disabled:opacity-60 sm:w-auto"
      >
        {busy ? s.submitting : s.submit}
      </button>
    </form>
  );
}
