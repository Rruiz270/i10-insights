import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { alternateLocaleHref, t } from "@/lib/i18n";

export function Header({ locale, pathname }: { locale: Locale; pathname: string }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-navy">
            i<span className="text-cyan">10</span>
          </span>
          <span className="text-sm font-semibold text-gray-700">Insights</span>
        </Link>
        <nav aria-label={t(locale, "lang.switch.label")} className="flex items-center gap-1">
          <Link
            href={locale === "pt" ? pathname : alternateLocaleHref(locale, pathname)}
            aria-current={locale === "pt" ? "true" : undefined}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              locale === "pt"
                ? "bg-navy text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            PT
          </Link>
          <Link
            href={locale === "en" ? pathname : alternateLocaleHref(locale, pathname)}
            aria-current={locale === "en" ? "true" : undefined}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              locale === "en"
                ? "bg-navy text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            EN
          </Link>
        </nav>
      </div>
    </header>
  );
}
