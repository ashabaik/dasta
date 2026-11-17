import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import { currencyLabel, formatMoney } from "@/lib/format";

export function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="28" height="28" rx="6" fill="#16191d" />
      <rect x="8" y="6" width="14" height="5" rx="1" fill="#d9480f" />
      <rect x="13.5" y="11" width="3" height="8" fill="#fff" />
      <rect x="6" y="19" width="18" height="5" rx="1" fill="#fff" />
    </svg>
  );
}

/** Line drawings per category, used when a listing has no photo. Drawn for this project. */
const ICONS: Record<string, React.ReactNode> = {
  "hydraulic-pumps": (
    <>
      <circle cx="26" cy="32" r="11" />
      <circle cx="40" cy="32" r="11" />
      <path d="M8 32h7M51 32h7M33 14v7M33 43v7" />
    </>
  ),
  "hydraulic-cylinders": (
    <>
      <rect x="8" y="22" width="32" height="20" rx="2" />
      <path d="M40 32h16M56 26v12M16 22v20" />
    </>
  ),
  valves: (
    <>
      <path d="M10 22l22 10-22 10zM54 22L32 32l22 10z" />
      <path d="M32 32V16M24 16h16" />
    </>
  ),
  "hoses-fittings": (
    <>
      <path d="M8 44c12 0 12-24 24-24s12 24 24 24" />
      <rect x="4" y="40" width="8" height="8" />
      <rect x="52" y="40" width="8" height="8" />
    </>
  ),
  seals: (
    <>
      <circle cx="32" cy="32" r="18" />
      <circle cx="32" cy="32" r="11" />
    </>
  ),
  bearings: (
    <>
      <circle cx="32" cy="32" r="19" />
      <circle cx="32" cy="32" r="8" />
      <circle cx="32" cy="18.500" r="2.500" />
      <circle cx="45.500" cy="32" r="2.500" />
      <circle cx="32" cy="45.500" r="2.500" />
      <circle cx="18.500" cy="32" r="2.500" />
    </>
  ),
  "power-transmission": (
    <>
      <circle cx="32" cy="32" r="12" />
      <circle cx="32" cy="32" r="4" />
      <path d="M32 14v6M32 44v6M14 32h6M44 32h6M19.300 19.300l4.200 4.200M40.500 40.500l4.200 4.200M19.300 44.700l4.200-4.200M40.500 23.500l4.200-4.200" />
    </>
  ),
  filters: (
    <>
      <rect x="20" y="12" width="24" height="40" rx="3" />
      <path d="M20 22h24M20 32h24M20 42h24" />
    </>
  ),
};

export function CategoryArt({ slug, label }: { slug: string; label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[slug] ?? <rect x="14" y="14" width="36" height="36" rx="3" />}
      </svg>
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function Money({ piastres, locale, className = "" }: { piastres: number; locale: Locale; className?: string }) {
  return (
    <span className={className}>
      <span className="code">{formatMoney(piastres)}</span> <small className="text-xs font-normal text-muted">{currencyLabel(locale)}</small>
    </span>
  );
}

export type PublicSeller = { code: string; region: string; verified: boolean; rating_avg?: number | null; rating_count?: number };

/** The only way a seller is ever shown to a buyer: code, verified mark, region. Never a name. */
export function SellerChip({ seller, regionName, t, locale, link = true }: { seller: PublicSeller; regionName: string; t: Dict; locale: Locale; link?: boolean }) {
  const code = (
    <span className="font-medium text-ink">
      {t.seller.label} <span className="code">{seller.code}</span>
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
      {link ? (
        <Link href={`/${locale}/s/${seller.code}`} className="no-underline hover:underline">
          {code}
        </Link>
      ) : (
        code
      )}
      {seller.verified ? <span className="font-medium text-ok">✓ {t.seller.verified}</span> : null}
      <span>{regionName}</span>
      {seller.rating_count ? (
        <span title={t.rating.count(seller.rating_count)}>
          <span className="code">★ {Number(seller.rating_avg).toFixed(1)}</span> ({seller.rating_count})
        </span>
      ) : null}
    </div>
  );
}

export type Spec = { k_en: string; k_ar: string; v: string };

export function SpecList({ specs, locale, max }: { specs: Spec[]; locale: Locale; max?: number }) {
  const list = max ? specs.slice(0, max) : specs;
  if (!list.length) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
      {list.map((s, i) => (
        <div key={i} className="contents">
          <dt className="text-muted">{locale === "ar" ? s.k_ar || s.k_en : s.k_en}</dt>
          <dd className="code text-start">{s.v}</dd>
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
  condition: string;
  specs: Spec[];
  price_piastres: number;
  stock: number;
  categories: { slug: string; name_en: string; name_ar: string };
  sellers: PublicSeller;
  product_images: { path: string; sort: number }[];
};

export function imageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export function ProductCard({ p, t, locale, regions }: { p: CardProduct; t: Dict; locale: Locale; regions: Record<string, string> }) {
  const photo = [...p.product_images].sort((a, b) => a.sort - b.sort)[0];
  return (
    <article className="card flex flex-col gap-2.5">
      <Link href={`/${locale}/p/${p.ref}`} className="block h-28 overflow-hidden rounded bg-tile" tabIndex={-1} aria-hidden="true">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(photo.path)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <CategoryArt slug={p.categories.slug} label={t.catalogue.noPhoto} />
        )}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="code text-[12.5px] text-muted">{p.part_number}</span>
        <span className="tag">{t.condition[p.condition]}</span>
      </div>
      <h3 className="text-base font-semibold leading-snug">
        <Link href={`/${locale}/p/${p.ref}`} className="text-ink no-underline hover:underline">
          {pick(p, "title", locale)}
        </Link>
      </h3>
      <SpecList specs={p.specs} locale={locale} max={2} />
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Money piastres={p.price_piastres} locale={locale} className="text-[17px] font-semibold" />
        <span className="tag">{p.stock > 0 ? t.catalogue.inStock(p.stock) : t.catalogue.outOfStock}</span>
      </div>
      <div className="border-t border-dashed border-line pt-2.5">
        <SellerChip seller={p.sellers} regionName={regions[p.sellers.region] ?? ""} t={t} locale={locale} />
      </div>
    </article>
  );
}

export const CARD_SELECT =
  "ref, title_en, title_ar, part_number, condition, specs, price_piastres, stock, categories!inner(slug, name_en, name_ar), sellers!inner(code, region, verified, rating_avg, rating_count), product_images(path, sort)";
