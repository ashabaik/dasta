import type { Locale } from "./i18n";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Money is stored as integer piastres. Digits stay Latin in both languages, like part numbers. */
export function formatMoney(piastres: number): string {
  return nf.format(piastres / 100);
}

export function currencyLabel(locale: Locale): string {
  return locale === "ar" ? "ج.م" : "EGP";
}

/** "2026-11-01" -> "Nov 2026" / "نوفمبر 2026". Month only: the exact day is never shown. */
export function formatMonth(isoDate: string, locale: Locale): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(iso));
}

/** EGP typed by a seller ("8,400" or "8400.50") -> piastres, or null when it is not a valid amount. */
export function parseEgpToPiastres(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Math.round(Number(cleaned) * 100);
  return value > 0 ? value : null;
}
