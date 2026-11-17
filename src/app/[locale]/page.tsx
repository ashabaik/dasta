import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, CookingPot, LayoutGrid, Package, Plug, Shirt, Sparkles, Wrench } from "lucide-react";
import { asLocale, getDict, pick, type Dict, type Locale } from "@/lib/i18n";
import { formatQty } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";
import { CARD_SELECT, ProductCard, firstPhoto, type CardProduct } from "@/components/ui";
import { Footer } from "@/components/chrome";
import { Button } from "@/components/shadcn/button";
import { HomeMotion } from "@/components/home-motion";

const PAGE_SIZE = 12;

const CAT_ICON: Record<string, typeof Package> = {
  "home-kitchen": CookingPot,
  "office-supplies": Briefcase,
  packaging: Package,
  textiles: Shirt,
  "personal-care": Sparkles,
  "tools-hardware": Wrench,
  "electronics-accessories": Plug,
};
/** A scene photograph stands for a category where one exists; otherwise its newest product does. */
const CATEGORY_SCENE: Record<string, string> = { "home-kitchen": "/scenes/kitchen.jpg" };
// Aligns a full-bleed block's text with the page column.
const EDGE = "lg:ps-[max(2rem,calc((100vw-1240px)/2+2rem))]";

type Search = Record<string, string | string[] | undefined>;
type Category = { id: number; slug: string; name_en: string; name_ar: string };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function HomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 60);
  const cat = one(sp.cat);
  const region = one(sp.region);
  const sort = one(sp.sort);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  // Any question (a search, a category, a sort, "all products") gets the working catalogue; the bare
  // address gets the front door.
  const browsing = Boolean(q || cat || region || sort || one(sp.view) || page > 1);

  const supabase = await supabaseServer();
  const categoryQuery = supabase.from("categories").select("id, slug, name_en, name_ar").order("sort");

  if (browsing) return <Catalogue locale={locale} t={t} categories={(await categoryQuery).data ?? []} q={q} cat={cat} region={region} sort={sort} page={page} />;

  // Both questions go to the database together, so the first byte of the page is not kept waiting.
  // Only public columns are selected, and row level security filters the rows for this visitor.
  const [{ data: categories }, { data }] = await Promise.all([
    categoryQuery,
    supabase.from("products").select(CARD_SELECT).eq("status", "active").eq("sellers.status", "active").order("listed_on", { ascending: false }).order("ref").limit(400),
  ]);
  const products = (data ?? []) as unknown as CardProduct[];
  // Every number on this page is counted from the rows above.
  const live = (categories ?? [])
    .map((c) => {
      const own = products.filter((p) => p.categories.slug === c.slug);
      const cover = own.find((p) => p.product_images.length);
      return { ...c, count: own.length, cover, image: CATEGORY_SCENE[c.slug] ?? (cover ? firstPhoto(cover) : null) };
    })
    .filter((c) => c.count > 0);
  // A product whose photograph stands for its category stays out of the grid, so no photograph repeats.
  const covers = new Set(live.filter((c) => !CATEGORY_SCENE[c.slug]).map((c) => c.cover?.ref));
  const latest = products.filter((p) => !covers.has(p.ref)).slice(0, 8);
  const ar = locale === "ar";

  return (
    <div data-home>
      <div className="curtain">
        {/* Opening shot: the photograph fills its half of the first screen and runs off the window edge. */}
        <section data-hero className="flex flex-col lg:grid lg:min-h-[calc(100svh-72px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          <div className={`flex flex-col justify-end px-4 pb-2 pt-6 sm:px-8 lg:pb-16 lg:pe-12 lg:pt-10 ${EDGE}`}>
            <h1 data-hero-text className={`font-heading font-bold tracking-tight ${ar ? "text-[clamp(40px,5.7vw,90px)] leading-[1.24]" : "text-[clamp(44px,6.5vw,104px)] leading-[0.98]"}`}>
              {t.home.title}
            </h1>
            <p data-hero-fade className="mt-5 max-w-[38ch] text-[18px] text-muted-foreground sm:text-[20px]">
              {t.home.lead}
            </p>
            <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button asChild size="lg">
                <Link href={`/${locale}#products`}>{t.home.browse}</Link>
              </Button>
              <Link href={`/${locale}/signin#supplier`} className="inline-flex min-h-11 items-center text-[17px] font-medium text-primary underline underline-offset-4">
                {t.nav.sell}
              </Link>
            </div>
          </div>
          {/* On a phone the photograph comes first and is cropped to the lamp; the headline follows it. */}
          <div data-hero-media className="relative order-first mx-4 mt-1 aspect-[5/4] overflow-hidden rounded-[24px] bg-[#d3cfc5] sm:mx-8 sm:aspect-[16/9] lg:order-none lg:mx-0 lg:mt-0 lg:aspect-auto lg:rounded-none lg:rounded-es-[44px]">
            <div data-hero-parallax className="absolute inset-x-0 -top-[5%] h-[110%]">
              <Image data-hero-img src="/hero.jpg" alt="" fill preload fetchPriority="high" quality={60} sizes="(min-width: 1024px) 52vw, 100vw" className="object-cover object-[50%_66%] lg:object-[50%_58%]" />
            </div>
          </div>
        </section>

        <div className="wrap">
          {/* Categories: one tap each, scrolls sideways on a phone. */}
          <nav aria-label={t.nav.categories} className="-mx-4 mt-10 sm:mx-0 lg:mt-20">
            <ul className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
              <li className="shrink-0">
                <Link href={`/${locale}?view=all`} className="flex h-12 items-center gap-2 rounded-full bg-foreground px-4 text-[15px] font-medium text-background">
                  <LayoutGrid className="size-[18px]" aria-hidden="true" />
                  {t.catalogue.title}
                  <span className="num text-[13px] text-background/75">{formatQty(products.length)}</span>
                </Link>
              </li>
              {live.map((c) => {
                const Icon = CAT_ICON[c.slug] ?? Package;
                return (
                  <li key={c.slug} className="shrink-0">
                    <Link href={`/${locale}?cat=${c.slug}`} className="flex h-12 items-center gap-2 rounded-full bg-card px-4 text-[15px] font-medium text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground">
                      <Icon className="size-[18px]" aria-hidden="true" />
                      {pick(c, "name", locale)}
                      <span className="num text-[13px] text-muted-foreground">{formatQty(c.count)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section id="products" className="scroll-mt-28 pt-10 sm:pt-14">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-heading text-[30px] font-bold tracking-tight sm:text-[44px] rtl:leading-[1.4]">{t.catalogue.latest}</h2>
              <Link href={`/${locale}?view=all`} className="inline-flex min-h-11 items-center text-[15px] font-medium text-primary underline underline-offset-4">
                {t.catalogue.title}
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:mt-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
              {latest.map((p, i) => (
                <ProductCard key={p.ref} p={p} t={t} locale={locale} reveal={i % 4} />
              ))}
            </div>
          </section>
        </div>

        {/* The signature scene. On a desktop it is held while the row of categories travels sideways
            with the scroll; without motion, and on a phone, the same row is swiped or scrolled by hand. */}
        <section id="categories" data-cat-scene className="mt-24 scroll-mt-24 lg:mt-36">
          <div data-cat-track className={`no-scrollbar lg:flex lg:items-center lg:gap-12 lg:overflow-x-auto ${EDGE}`}>
            <div className="px-4 sm:px-8 lg:w-[400px] lg:shrink-0 lg:px-0">
              <h2 className={`font-heading font-bold tracking-tight ${ar ? "text-[32px] leading-[1.3] lg:text-[60px]" : "text-[34px] leading-[1.02] lg:text-[72px]"}`}>{t.catalogue.shopByCategory}</h2>
              <p className="mt-3 max-w-[28ch] text-[17px] text-muted-foreground lg:mt-5 lg:text-[19px]">{t.catalogue.shopByCategoryText}</p>
            </div>
            <ul className="no-scrollbar mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-1 sm:px-8 lg:mt-0 lg:shrink-0 lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0">
              {live.map((c) => (
                <li key={c.slug} className="w-[66vw] max-w-[320px] shrink-0 snap-start lg:w-[calc(min(56vh,540px)*0.8)] lg:max-w-none">
                  <Link href={`/${locale}?cat=${c.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-muted">{c.image ? <Image src={c.image} alt="" fill quality={60} sizes="(min-width: 1024px) 432px, 66vw" className="object-cover" /> : null}</div>
                    <p className="mt-4 font-heading text-[22px] font-bold tracking-tight underline-offset-4 group-hover:underline lg:text-[28px]">{pick(c, "name", locale)}</p>
                    <p className="text-muted-foreground">{t.catalogue.results(c.count)}</p>
                  </Link>
                </li>
              ))}
              <li className="w-[66vw] max-w-[320px] shrink-0 snap-start lg:w-[calc(min(56vh,540px)*0.8)] lg:max-w-none">
                <Link href={`/${locale}?view=all`} className="group block">
                  <div className="flex aspect-[4/5] flex-col justify-between rounded-[22px] bg-card p-6 transition-colors duration-200 group-hover:bg-accent lg:p-8">
                    <span className="num font-heading text-[64px] font-bold leading-none tracking-tight lg:text-[88px]">{formatQty(products.length)}</span>
                    <span className="grid size-14 place-items-center self-end rounded-full bg-primary text-primary-foreground">
                      <ArrowRight className="size-6 rtl:rotate-180" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-4 font-heading text-[22px] font-bold tracking-tight underline-offset-4 group-hover:underline lg:text-[28px]">{t.catalogue.title}</p>
                  <p className="text-muted-foreground">{t.catalogue.categoriesCount(live.length)}</p>
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* A quiet scene after the strong one. The three steps really are a sequence, so they are numbered;
            on a desktop they run across the full width. */}
        <section id="how" className="wrap scroll-mt-24 pb-24 pt-24 lg:pb-40 lg:pt-36">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-2">
            <h2 className="font-heading text-[30px] font-bold tracking-tight sm:text-[44px] rtl:leading-[1.4]">{t.home.howTitle}</h2>
            <p className="max-w-[40ch] text-[17px] text-muted-foreground">{t.home.howText}</p>
          </div>
          <ol className="mt-8 grid gap-x-10 lg:mt-12 lg:grid-cols-3 lg:gap-x-14">
            {t.home.steps.map(([title, text], i) => (
              <li key={title} className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-t border-border py-6 sm:grid-cols-[5rem_1fr] sm:py-8 lg:block lg:border-t-2 lg:border-foreground lg:py-7">
                <span className="num font-heading text-[36px] font-bold leading-none text-primary sm:text-[48px] lg:text-[72px]" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="lg:mt-5">
                  <h3 className="font-heading text-[22px] font-bold tracking-tight sm:text-[26px] lg:text-[30px]">{title}</h3>
                  <p className="mt-1.5 max-w-[40ch] text-muted-foreground lg:mt-2.5 lg:text-[17px]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div data-curtain-end />
      </div>
      <Footer locale={locale} t={t} closing />
      <HomeMotion />
    </div>
  );
}

/** The working catalogue: search results, one category, sorting. A light screen: nothing is held, nothing scrubs. */
async function Catalogue({ locale, t, categories, q, cat, region, sort, page }: { locale: Locale; t: Dict; categories: Category[]; q: string; cat: string; region: string; sort: string; page: number }) {
  const supabase = await supabaseServer();
  const [{ data: regions }, { data: stocked }] = await Promise.all([
    supabase.from("regions").select("key, name_en, name_ar").order("name_en"),
    supabase.from("products").select("category_id, sellers!inner(status)").eq("status", "active").eq("sellers.status", "active").limit(1000),
  ]);
  const regionNames = Object.fromEntries((regions ?? []).map((r) => [r.key, pick(r, "name", locale)]));
  const category = categories.find((c) => c.slug === cat);
  // Only categories that have something to show are offered as a filter.
  const inUse = new Set((stocked ?? []).map((p) => p.category_id));
  const offered = categories.filter((c) => inUse.has(c.id) || c.slug === cat);

  // Only public columns are selected, and row level security filters the rows for this visitor.
  let query = supabase.from("products").select(CARD_SELECT, { count: "exact" }).eq("status", "active").eq("sellers.status", "active");
  if (q) query = query.ilike("search_text", `%${q.toLowerCase().replace(/[%_\\]/g, " ")}%`);
  if (category) query = query.eq("category_id", category.id);
  if (region && regionNames[region]) query = query.eq("sellers.region", region);
  if (sort === "price-asc") query = query.order("price_piastres", { ascending: true });
  else if (sort === "price-desc") query = query.order("price_piastres", { ascending: false });
  else query = query.order("listed_on", { ascending: false });
  const { data, count } = await query.order("ref").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const products = (data ?? []) as unknown as CardProduct[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (over: Record<string, string | number>) => {
    const u = new URLSearchParams();
    const next = { q, cat, region, sort, page: 1, ...over };
    if (next.q) u.set("q", String(next.q));
    if (next.cat) u.set("cat", String(next.cat));
    if (next.region) u.set("region", String(next.region));
    if (next.sort) u.set("sort", String(next.sort));
    if (Number(next.page) > 1) u.set("page", String(next.page));
    if (![...u.keys()].length) u.set("view", "all");
    return `/${locale}?${u.toString()}`;
  };
  const chip = (active: boolean) => `flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors duration-200 ${active ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-accent hover:text-accent-foreground"}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <h1 className="page-title">{category ? pick(category, "name", locale) : t.catalogue.title}</h1>
        <p className="text-[15px] text-muted-foreground" data-testid="result-count">
          {q ? <span className="font-medium text-foreground">&ldquo;{q}&rdquo; </span> : null}
          {t.catalogue.results(total)}
        </p>
      </div>

      <nav aria-label={t.filters.category} className="-mx-4 mt-6 sm:mx-0">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
          <li className="shrink-0">
            <Link href={href({ cat: "" })} aria-current={category ? undefined : "true"} className={chip(!category)}>
              {t.filters.allCategories}
            </Link>
          </li>
          {offered.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link href={href({ cat: c.slug })} aria-current={c.slug === cat ? "true" : undefined} className={chip(c.slug === cat)}>
                {pick(c, "name", locale)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form action={`/${locale}`} className="mt-4 flex flex-wrap items-end gap-3">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        {!q && !cat ? <input type="hidden" name="view" value="all" /> : null}
        <div className="min-w-[160px] flex-1 sm:max-w-[240px]">
          <label className="label" htmlFor="f-sort">
            {t.filters.sort}
          </label>
          <select id="f-sort" name="sort" defaultValue={sort} className="input">
            <option value="">{t.filters.sortNewest}</option>
            <option value="price-asc">{t.filters.sortPriceAsc}</option>
            <option value="price-desc">{t.filters.sortPriceDesc}</option>
          </select>
        </div>
        <div className="min-w-[160px] flex-1 sm:max-w-[240px]">
          <label className="label" htmlFor="f-region">
            {t.filters.region}
          </label>
          <select id="f-region" name="region" defaultValue={region} className="input">
            <option value="">{t.filters.allRegions}</option>
            {(regions ?? []).map((r) => (
              <option key={r.key} value={r.key}>
                {pick(r, "name", locale)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-dark min-h-12">
          {t.filters.apply}
        </button>
        {q || cat || region || sort ? (
          <Link href={`/${locale}?view=all`} className="btn btn-ghost min-h-12">
            {t.filters.clear}
          </Link>
        ) : null}
      </form>

      {products.length === 0 ? (
        <p className="card mt-8 text-muted-foreground">{t.catalogue.empty}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
          {products.map((p) => (
            <ProductCard key={p.ref} p={p} t={t} locale={locale} />
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav className="mt-12 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className="btn btn-ghost">
              {t.catalogue.prev}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[15px] text-muted-foreground">{t.catalogue.page(Math.min(page, pages), pages)}</span>
          {page < pages ? (
            <Link href={href({ page: page + 1 })} className="btn btn-dark">
              {t.catalogue.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: { absolute: `${t.brand} · ${t.tagline}` } };
}
