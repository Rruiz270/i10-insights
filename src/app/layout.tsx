import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "i10 Insights — IA na educação brasileira",
    template: "%s · i10 Insights",
  },
  description:
    "Análise diária do Instituto i10 sobre inteligência artificial aplicada à educação. Pesquisa, política pública, ferramentas e equidade.",
  metadataBase: new URL("https://www.institutoi10.com.br"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "i10 Insights",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
