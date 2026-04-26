export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type StringMap = Record<string, string>;

const STRINGS: Record<Locale, StringMap> = {
  pt: {
    "site.tagline": "IA na educação brasileira — análise diária do Instituto i10",
    "hub.eyebrow": "i10 Insights",
    "hub.title": "Inteligência artificial na educação, todo dia útil.",
    "hub.lead":
      "Pesquisa, política pública, ferramentas e equidade. Análise curada pelo Instituto i10, baseada em evidências.",
    "hub.empty.title": "Em construção",
    "hub.empty.body":
      "O primeiro lote de análises chega em breve. Cadastre-se no boletim para receber assim que publicarmos.",
    "newsletter.cta": "Receber por e-mail",
    "newsletter.subtitle":
      "Boletim grátis, sem spam. Cancele quando quiser. Política de privacidade conforme a LGPD.",
    "categories.politica": "Política & Equidade",
    "categories.sala_de_aula": "Sala de Aula",
    "categories.pesquisa": "Pesquisa",
    "categories.ferramentas": "Ferramentas & LLMs",
    "categories.etica": "Ética & Futuro",
    "footer.privacy": "Política de Privacidade",
    "footer.about": "Sobre o Instituto i10",
    "lang.switch.label": "Idioma",
    "lang.switch.pt": "Português",
    "lang.switch.en": "English",
  },
  en: {
    "site.tagline": "AI in Brazilian education — daily analysis from Instituto i10",
    "hub.eyebrow": "i10 Insights",
    "hub.title": "Artificial intelligence in education, every weekday.",
    "hub.lead":
      "Research, public policy, tools, and equity. Evidence-based analysis curated by Instituto i10.",
    "hub.empty.title": "Coming soon",
    "hub.empty.body":
      "The first batch of analyses lands shortly. Sign up to the newsletter to be notified.",
    "newsletter.cta": "Get it by email",
    "newsletter.subtitle":
      "Free newsletter, no spam. Unsubscribe anytime. Privacy policy compliant with LGPD.",
    "categories.politica": "Policy & Equity",
    "categories.sala_de_aula": "Classroom",
    "categories.pesquisa": "Research",
    "categories.ferramentas": "Tools & LLMs",
    "categories.etica": "Ethics & Future",
    "footer.privacy": "Privacy Policy",
    "footer.about": "About Instituto i10",
    "lang.switch.label": "Language",
    "lang.switch.pt": "Português",
    "lang.switch.en": "English",
  },
};

export function t(locale: Locale, key: string): string {
  return STRINGS[locale][key] ?? STRINGS[DEFAULT_LOCALE][key] ?? key;
}

export function alternateLocaleHref(currentLocale: Locale, path: string): string {
  const other: Locale = currentLocale === "pt" ? "en" : "pt";
  return path.replace(`/${currentLocale}`, `/${other}`);
}
