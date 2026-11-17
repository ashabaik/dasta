import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { BadgeCheck, Star } from "lucide-react";
import type { Dict, Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import { currencyLabel, formatMoney, formatQty } from "@/lib/format";

/** The mark: a dozen dots in a green square (dasta = a dozen), the twelfth one faint. */
export function Wordmark({ locale, onDark = false, size = 30 }: { locale: Locale; onDark?: boolean; size?: number }) {
  return (
    <span className="flex items-center gap-2.5 font-heading text-[22px] font-bold leading-none tracking-tight">
      <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
        <rect width="30" height="30" rx="9" fill={onDark ? "#fff" : "var(--primary)"} />
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <circle key={`${r}${c}`} cx={7.5 + c * 5} cy={10 + r * 5} r="1.6" fill={onDark ? "var(--primary)" : "#fff"} opacity={r === 2 && c === 3 ? 0.45 : 1} />))}
      </svg>
      {locale === "ar" ? "دستة" : "Dasta"}
    </span>
  );
}

export function Money({ piastres, locale, className = "" }: { piastres: number; locale: Locale; className?: string }) {
  return (
    <span className={className}>
      <span className="num">{formatMoney(piastres)}</span> <span className="text-[0.72em] font-normal text-muted-foreground">{currencyLabel(locale)}</span>
    </span>
  );
}

export type PriceBreak = { qty: number; price_piastres: number };

/** Mirrors app.unit_price in the database (which is the one that decides): the deepest break the quantity reaches. */
export function unitPriceFor(base: number, breaks: PriceBreak[], qty: number): number {
  let price = base;
  for (const b of breaks) if (qty >= b.qty) price = b.price_piastres;
  return price;
}

export type PublicSeller = { code: string; region: string; verified: boolean; rating_avg?: number | null; rating_count?: number };

/** The only way a supplier is ever shown to a buyer: code, verified mark, region. Never a name. */
export function SellerChip({ seller, regionName, t, locale, link = true }: { seller: PublicSeller; regionName: string; t: Dict; locale: Locale; link?: boolean }) {
  const code = (
    <span className="font-semibold text-foreground">
      {t.seller.label} <span className="num">{seller.code}</span>
    </span>
  );
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-card text-[15px] font-semibold" aria-hidden="true">
        {seller.code.slice(0, 1)}
      </span>
      <div className="min-w-0 text-[15px]">
        {link ? (
          // A full-height touch target that does not push the lines apart.
          <Link href={`/${locale}/s/${seller.code}`} className="-my-3 inline-flex min-h-11 items-center underline-offset-4 hover:underline">
            {code}
          </Link>
        ) : (
          code
        )}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          {seller.verified ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <BadgeCheck className="size-4" aria-hidden="true" />
              {t.seller.verified}
            </span>
          ) : (
            <span>{t.seller.notVerified}</span>
          )}
          {regionName ? <span>{regionName}</span> : null}
          {/* A rating appears only when buyers with completed orders have given one. */}
          {seller.rating_count ? (
            <span className="inline-flex items-center gap-1" title={t.rating.count(seller.rating_count)}>
              <Star className="size-4 fill-[#f5a524] text-[#f5a524]" aria-hidden="true" />
              <span className="num font-medium text-foreground">{Number(seller.rating_avg).toFixed(1)}</span>
              <span className="num">({seller.rating_count})</span>
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

/** One line of product details. `v_ar` is the value in Arabic where it differs. */
export type Spec = { k_en: string; k_ar: string; v: string; v_ar?: string };

export function SpecList({ specs, locale }: { specs: Spec[]; locale: Locale }) {
  if (!specs.length) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
      {specs.map((s, i) => (
        <div key={i} className="contents">
          <dt className="text-muted-foreground">{locale === "ar" ? s.k_ar || s.k_en : s.k_en}</dt>
          <dd className="text-start">{locale === "ar" ? s.v_ar || s.v : s.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export type CardProduct = {
  ref: string;
  title_en: string;
  title_ar: string;
  part_number: string;
  price_piastres: number;
  stock: number;
  unit_en: string;
  unit_ar: string;
  min_order_qty: number;
  lead_days: number;
  price_breaks: PriceBreak[];
  listed_on: string;
  categories: { slug: string; name_en: string; name_ar: string };
  sellers: PublicSeller;
  product_images: { path: string; sort: number }[];
};

export const CARD_SELECT =
  "ref, title_en, title_ar, part_number, price_piastres, stock, unit_en, unit_ar, min_order_qty, lead_days, price_breaks, listed_on, categories!inner(slug, name_en, name_ar), sellers!inner(code, region, verified, rating_avg, rating_count), product_images(path, sort)";

export function imageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export function firstPhoto(p: { product_images: { path: string; sort: number }[] }): string | null {
  const photo = [...p.product_images].sort((a, b) => a.sort - b.sort)[0];
  return photo ? imageUrl(photo.path) : null;
}

/**
 * A product in a list: a tall photograph with nothing around it, and the trade terms underneath
 * (price per unit, minimum order, supplier code). `reveal` is the column index when the photograph
 * should uncover on scroll (home page only).
 */
export function ProductCard({ p, t, locale, reveal, sizes = "(min-width: 1024px) 290px, (min-width: 640px) 31vw, 46vw" }: { p: CardProduct; t: Dict; locale: Locale; reveal?: number; sizes?: string }) {
  const src = firstPhoto(p);
  return (
    <Link href={`/${locale}/p/${p.ref}`} className="group block">
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-muted"
        data-photo-reveal={reveal === undefined ? undefined : ""}
        style={reveal === undefined ? undefined : ({ "--i": reveal } as React.CSSProperties)}
      >
        {src ? (
          // The photograph travels with the click to the product page.
          <ViewTransition name={`photo-${p.ref}`} share="morph" default="none">
            <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
          </ViewTransition>
        ) : null}
      </div>
      <h3 className="mt-3.5 text-[16px] font-medium leading-snug underline-offset-4 group-hover:underline">{pick(p, "title", locale)}</h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[18px] font-semibold">
        <span className="num">{formatMoney(p.price_piastres)}</span>
        <span className="text-sm font-normal text-muted-foreground">
          {currencyLabel(locale)} / {pick(p, "unit", locale)}
        </span>
      </p>
      <p className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
        <span>
          {t.product.moq} <span className="num text-foreground">{formatQty(p.min_order_qty)}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          {p.sellers.verified ? <BadgeCheck className="size-4 text-primary" aria-label={t.seller.verified} /> : null}
          <span className="num">{p.sellers.code}</span>
        </span>
      </p>
    </Link>
  );
}
