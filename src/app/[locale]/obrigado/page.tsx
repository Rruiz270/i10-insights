import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/lib/i18n";

export default async function ThanksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isPt = locale === "pt";
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
        i10 Insights
      </p>
      <h1 className="mt-4 font-serif text-3xl text-navy sm:text-4xl">
        {isPt ? "Inscrição confirmada" : "Subscription confirmed"}
      </h1>
      <p className="mt-4 text-gray-700">
        {isPt
          ? "Tudo certo. Você passa a receber o i10 Insights por e-mail."
          : "All set. You'll start receiving i10 Insights by email."}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-8 inline-block rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-dark"
      >
        {isPt ? "Voltar ao início" : "Back to home"}
      </Link>
    </div>
  );
}
