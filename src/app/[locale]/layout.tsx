import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LOCALES, isLocale, t, SITE_URL } from "@/lib/i18n";

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === "pt"
    ? "i10 Insights — IA na educação brasileira"
    : "i10 Insights — AI in Brazilian education";
  return {
    title,
    description: t(locale, "site.tagline"),
    alternates: {
      canonical: `${SITE_URL}/insights/${locale}`,
      languages: {
        "pt-BR": `${SITE_URL}/insights/pt`,
        "en-US": `${SITE_URL}/insights/en`,
        "x-default": `${SITE_URL}/insights/pt`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "pt" ? "pt_BR" : "en_US",
      url: `${SITE_URL}/insights/${locale}`,
      siteName: "i10 Insights",
      title,
      description: t(locale, "site.tagline"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <>
      <Header locale={locale} pathname={`/${locale}`} />
      <div className="flex-1">{children}</div>
      <Footer locale={locale} />
    </>
  );
}
