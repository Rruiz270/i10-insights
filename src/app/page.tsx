import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

export default async function Root() {
  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  // Pick the first language tag and check whether we support it; otherwise default.
  const first = accept.split(",")[0]?.trim().split("-")[0] ?? "";
  const locale = isLocale(first) ? first : DEFAULT_LOCALE;
  redirect(`/${locale}`);
}
