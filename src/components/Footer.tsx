import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-gray-200 bg-off-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Instituto i10 · institutoi10.com.br</p>
        <nav className="flex gap-6">
          <Link href={`/${locale}/privacidade`} className="hover:text-navy">
            {t(locale, "footer.privacy")}
          </Link>
          <a
            href="https://www.institutoi10.com.br"
            className="hover:text-navy"
            rel="noopener"
          >
            {t(locale, "footer.about")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
