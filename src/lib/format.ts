import type { Locale } from "./i18n";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Money is stored as integer piastres. Digits stay Latin in both languages, like product codes. */
export function formatMoney(piastres: number): string {
  // Whole amounts stay short ("68"); anything else always shows both decimals ("62.56", "57.80").
  return piastres % 100 === 0 ? nf.format(piastres / 100) : nf2.format(piastres / 100);
}

/** Whole quantities: "1,000". Digits stay Latin in both languages. */
export function formatQty(n: number): string {
  return nf.format(n);
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

/** EGP typed by a supplier ("8,400" or "8400.50") -> piastres, or null when it is not a valid amount. */
export function parseEgpToPiastres(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Math.round(Number(cleaned) * 100);
  return value > 0 ? value : null;
}
