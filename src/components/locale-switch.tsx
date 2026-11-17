"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Link to the same page in the other language. */
export function LocaleSwitch({ locale, label, className = "" }: { locale: "en" | "ar"; label: string; className?: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const search = useSearchParams()?.toString();
  const other = locale === "ar" ? "en" : "ar";
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
  return (
    <Link href={`/${other}${rest}${search ? `?${search}` : ""}`} className={className} lang={other} hrefLang={other} prefetch={false}>
      {label}
    </Link>
  );
}
