import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import { currencyLabel, formatMoney } from "@/lib/format";

/** The mark: a press. Orange square, white ram and bed. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#f2600c" />
      <rect x="8" y="6.500" width="16" height="5.500" rx="1.500" fill="#fff" />
      <rect x="14.250" y="12" width="3.500" height="8" fill="#fff" />
      <rect x="6" y="20" width="20" height="5.500" rx="1.500" fill="#fff" />
    </svg>
  );
}

// ---- small line icons, drawn for this project ----
type IconProps = { size?: number; className?: string };
function Svg({ size = 20, className = "", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      {children}
    </svg>
  );
}
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5.500c0 4.300-2.900 7.800-7 9.500-4.100-1.700-7-5.200-7-9.500V6l7-3z" />
    <path d="M9 12l2.200 2.200L15.200 10" />
  </Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.500" width="14" height="10" rx="2" />
    <path d="M8 10.500V7.500a4 4 0 018 0v3" />
    <circle cx="12" cy="15.500" r="1.200" />
  </Svg>
);
export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.500h16v10.500H10l-4.500 3.500V16H4z" />
    <path d="M8 9.500h8M8 12.500h5" />
  </Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.500" />
    <path d="M16 16l4.500 4.500" />
  </Svg>
);
export const IconCart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.500 5h2.500l2 10.500h9.500l2-7.500H7" />
    <circle cx="9.500" cy="19" r="1.300" />
    <circle cx="16.500" cy="19" r="1.300" />
  </Svg>
);
export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6.500h10.500v9.500H3zM13.500 10h4l3 3v3h-7z" />
    <circle cx="7" cy="17.500" r="1.700" />
    <circle cx="17" cy="17.500" r="1.700" />
  </Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.500" />
    <path d="M8.300 12.300l2.500 2.500 5-5.300" />
  </Svg>
);
export const IconStore = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.500l1.500-5h13l1.500 5M5 9.500V20h14V9.500M4 9.500h16M10 20v-5.500h4V20" />
  </Svg>
);
export const IconGear = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.200" />
    <path d="M12 3.500v2.300M12 18.200v2.300M3.500 12h2.300M18.200 12h2.300M6 6l1.600 1.600M16.400 16.400L18 18M6 18l1.600-1.600M16.400 7.600L18 6" />
  </Svg>
);
export const IconUserPlus = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="8.500" r="3.500" />
    <path d="M3.500 20c.500-3.600 3.100-5.500 6.500-5.500s6 1.900 6.500 5.500M18.500 6.500v5M16 9h5" />
  </Svg>
);

/** Line drawings per category. Drawn for this project. */
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

export function CategoryIcon({ slug, size = 40 }: { slug: string; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {ICONS[slug] ?? <rect x="14" y="14" width="36" height="36" rx="3" />}
    </svg>
  );
}

export function CategoryArt({ slug, label }: { slug: string; label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-tile to-line text-muted">
      <CategoryIcon slug={slug} size={64} />
      {label ? <span className="text-xs">{label}</span> : null}
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
    <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-navy text-white">
        <IconShield size={14} />
      </span>
      <span>
        {t.seller.label} <span className="code">{seller.code}</span>
      </span>
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
      {link ? (
        <Link href={`/${locale}/s/${seller.code}`} className="no-underline hover:underline">
          {code}
        </Link>
      ) : (
        code
      )}
      {seller.verified ? <span className="font-semibold text-ok">✓ {t.seller.verified}</span> : null}
      <span>{regionName}</span>
      {seller.rating_count ? (
        <span title={t.rating.count(seller.rating_count)}>
          <span className="code font-medium text-accent-dark">★ {Number(seller.rating_avg).toFixed(1)}</span> ({seller.rating_count})
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

const CONDITION_STYLE: Record<string, string> = {
  new: "bg-ok text-white",
  refurbished: "bg-steel text-white",
  used: "bg-navy text-white",
};

/** Image-first product card. */
export function ProductCard({ p, t, locale, regions }: { p: CardProduct; t: Dict; locale: Locale; regions: Record<string, string> }) {
  const photo = [...p.product_images].sort((a, b) => a.sort - b.sort)[0];
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <Link href={`/${locale}/p/${p.ref}`} className="relative block aspect-[4/3] overflow-hidden bg-tile" tabIndex={-1} aria-hidden="true">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(photo.path)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <CategoryArt slug={p.categories.slug} label="" />
        )}
        <span className={`absolute start-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${CONDITION_STYLE[p.condition] ?? "bg-navy text-white"}`}>{t.condition[p.condition]}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="code text-[12.5px] font-medium text-steel">{p.part_number}</span>
          <span className="text-xs text-muted">{pick(p.categories, "name", locale)}</span>
        </div>
        <h3 className="text-base font-semibold leading-snug">
          <Link href={`/${locale}/p/${p.ref}`} className="text-ink no-underline group-hover:text-steel">
            {pick(p, "title", locale)}
          </Link>
        </h3>
        <SpecList specs={p.specs} locale={locale} max={2} />
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
          <Money piastres={p.price_piastres} locale={locale} className="text-xl font-bold" />
          <span className={`text-xs font-medium ${p.stock > 0 ? "text-ok" : "text-danger"}`}>{p.stock > 0 ? t.catalogue.inStock(p.stock) : t.catalogue.outOfStock}</span>
        </div>
        <div className="border-t border-line pt-2.5">
          <SellerChip seller={p.sellers} regionName={regions[p.sellers.region] ?? ""} t={t} locale={locale} />
        </div>
      </div>
    </article>
  );
}

export const CARD_SELECT =
  "ref, title_en, title_ar, part_number, condition, specs, price_piastres, stock, categories!inner(slug, name_en, name_ar), sellers!inner(code, region, verified, rating_avg, rating_count), product_images(path, sort)";
