import Link from "next/link";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { CARD_SELECT, CategoryIcon, IconCart, IconChat, IconCheck, IconLock, IconSearch, IconShield, IconTruck, ProductCard, imageUrl, type CardProduct } from "@/components/ui";

const PAGE_SIZE = 12;
const CONDITIONS = ["new", "used", "refurbished"];

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CataloguePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const h = t.home;
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 60);
  const cat = one(sp.cat);
  const cond = CONDITIONS.includes(one(sp.cond)) ? one(sp.cond) : "";
  const region = one(sp.region);
  const sort = one(sp.sort);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const filtered = Boolean(q || cat || cond || region || sort || page > 1);

  const supabase = await supabaseServer();
  const [{ data: categories }, { data: regions }] = await Promise.all([
    supabase.from("categories").select("id, slug, name_en, name_ar").order("sort"),
    supabase.from("regions").select("key, name_en, name_ar").order("name_en"),
  ]);
  const regionNames = Object.fromEntries((regions ?? []).map((r) => [r.key, pick(r, "name", locale)]));
  const category = (categories ?? []).find((c) => c.slug === cat);

  // Only public columns are selected, and row level security filters the rows for this visitor.
  let query = supabase.from("products").select(CARD_SELECT, { count: "exact" }).eq("status", "active").eq("sellers.status", "active");
  if (q) query = query.ilike("search_text", `%${q.toLowerCase().replace(/[%_\\]/g, " ")}%`);
  if (category) query = query.eq("category_id", category.id);
  if (cond) query = query.eq("condition", cond);
  if (region && regionNames[region]) query = query.eq("sellers.region", region);
  if (sort === "price-asc") query = query.order("price_piastres", { ascending: true });
  else if (sort === "price-desc") query = query.order("price_piastres", { ascending: false });
  else query = query.order("listed_on", { ascending: false });
  const { data, count } = await query.order("ref").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const products = (data ?? []) as unknown as CardProduct[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showcase = filtered ? [] : products.filter((p) => p.product_images.length).slice(0, 3);

  const link = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (cat) u.set("cat", cat);
    if (cond) u.set("cond", cond);
    if (region) u.set("region", region);
    if (sort) u.set("sort", sort);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/${locale}${s ? `?${s}` : ""}#catalogue`;
  };
  const trustIcons = [IconShield, IconLock, IconChat];
  const stepIcons = [IconCart, IconTruck, IconCheck];

  return (
    <>
      {!filtered ? (
        <section className="hero bleed">
          <div className="wrap relative grid grid-cols-1 items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[13px] font-medium text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {h.kicker}
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.12] sm:text-5xl">{h.title}</h1>
              <p className="mt-4 max-w-xl text-lg text-white/75">{h.lead}</p>
              <form action={`/${locale}`} className="mt-7 flex max-w-xl overflow-hidden rounded-xl bg-white shadow-lift" role="search">
                <input name="q" type="search" className="min-h-13 min-w-0 flex-1 border-0 bg-transparent px-4 text-base text-ink outline-none placeholder:text-muted" placeholder={t.search.placeholder} aria-label={t.search.placeholder} />
                <button type="submit" className="flex shrink-0 items-center gap-2 bg-accent px-5 text-base font-semibold text-white hover:bg-accent-dark">
                  <IconSearch size={19} />
                  {t.search.submit}
                </button>
              </form>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="#catalogue" className="btn btn-ondark btn-lg">
                  {h.browse}
                </a>
                <Link href={`/${locale}/signin`} className="btn btn-lg">
                  {h.demo}
                </Link>
              </div>
            </div>

            {showcase.length === 3 ? (
              <div className="relative mx-auto hidden h-[400px] w-full max-w-[460px] lg:block" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(showcase[1].product_images[0].path)} alt="" className="absolute end-0 top-2 h-52 w-64 -rotate-3 rounded-2xl border-4 border-white/90 object-cover shadow-lift" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(showcase[2].product_images[0].path)} alt="" className="absolute bottom-0 end-10 h-44 w-56 rotate-2 rounded-2xl border-4 border-white/90 object-cover shadow-lift" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(showcase[0].product_images[0].path)} alt="" className="absolute start-0 top-24 h-56 w-72 rotate-1 rounded-2xl border-4 border-white object-cover shadow-lift" />
                <span className="absolute start-3 top-12 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink shadow-lift">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-navy text-white">
                    <IconShield size={14} />
                  </span>
                  <span>
                    {t.seller.label} <span className="code">{showcase[0].sellers.code}</span>
                  </span>
                  <span className="text-ok">✓</span>
                </span>
                <span className="absolute bottom-6 start-6 inline-flex items-center gap-2 rounded-xl bg-held-bg px-3 py-2 text-sm font-semibold text-held shadow-lift">
                  <IconLock size={16} />
                  {h.held}
                </span>
              </div>
            ) : null}
          </div>

          <div className="relative border-t border-white/10 bg-black/15">
            <ul className="wrap grid grid-cols-1 gap-x-8 gap-y-4 py-5 sm:grid-cols-3">
              {h.trust.map(([title, desc], i) => {
                const Icon = trustIcons[i];
                return (
                  <li key={title} className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-white">
                      <Icon size={20} />
                    </span>
                    <span>
                      <b className="block text-[15px] font-semibold text-white">{title}</b>
                      <span className="text-[13px] text-white/65">{desc}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {!filtered ? (
        <section>
          <h2 className="h-section">{h.categories}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(categories ?? []).map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${locale}?cat=${c.slug}#catalogue`}
                  className="group flex h-full items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-ink no-underline shadow-card transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lift"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-tile text-steel transition group-hover:bg-accent-soft group-hover:text-accent-dark">
                    <CategoryIcon slug={c.slug} size={34} />
                  </span>
                  <span className="text-sm font-semibold leading-snug">{pick(c, "name", locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="catalogue" className="scroll-mt-28">
        <div className={`flex flex-wrap items-baseline justify-between gap-2 ${filtered ? "mt-7" : ""}`}>
          {filtered ? <h1 className="text-3xl font-bold">{t.catalogue.title}</h1> : <h2 className="h-section">{t.catalogue.title}</h2>}
          <p className="text-sm text-muted" data-testid="result-count">
            {q ? (
              <>
                <span className="font-semibold text-ink">&ldquo;{q}&rdquo;</span> ·{" "}
              </>
            ) : null}
            {t.catalogue.results(total)}
          </p>
        </div>

        <form action={`/${locale}`} className="card mt-3 grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <div>
            <label className="label" htmlFor="f-cat">
              {t.filters.category}
            </label>
            <select id="f-cat" name="cat" defaultValue={cat} className="input">
              <option value="">{t.filters.allCategories}</option>
              {(categories ?? []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {pick(c, "name", locale)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-cond">
              {t.filters.condition}
            </label>
            <select id="f-cond" name="cond" defaultValue={cond} className="input">
              <option value="">{t.filters.anyCondition}</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {t.condition[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
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
          <div>
            <label className="label" htmlFor="f-sort">
              {t.filters.sort}
            </label>
            <select id="f-sort" name="sort" defaultValue={sort} className="input">
              <option value="">{t.filters.sortNewest}</option>
              <option value="price-asc">{t.filters.sortPriceAsc}</option>
              <option value="price-desc">{t.filters.sortPriceDesc}</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-2 lg:col-span-1">
            <button type="submit" className="btn btn-dark">
              {t.filters.apply}
            </button>
            <Link href={`/${locale}`} className="btn btn-ghost">
              {t.filters.clear}
            </Link>
          </div>
        </form>

        {products.length === 0 ? (
          <p className="card mt-4 text-muted">{t.catalogue.empty}</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.ref} p={p} t={t} locale={locale} regions={regionNames} />
            ))}
          </div>
        )}

        {pages > 1 ? (
          <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
            {page > 1 ? (
              <Link href={link(page - 1)} className="btn btn-ghost">
                {t.catalogue.prev}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted">{t.catalogue.page(Math.min(page, pages), pages)}</span>
            {page < pages ? (
              <Link href={link(page + 1)} className="btn btn-dark">
                {t.catalogue.next}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>

      {!filtered ? (
        <>
          <section>
            <h2 className="h-section">{h.howTitle}</h2>
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {h.steps.map(([title, desc], i) => {
                const Icon = stepIcons[i];
                return (
                  <li key={title} className="card relative overflow-hidden p-5">
                    <span className="code absolute end-4 top-2 text-6xl font-bold text-tile">{i + 1}</span>
                    <span className="relative grid h-11 w-11 place-items-center rounded-lg bg-navy text-white">
                      <Icon size={22} />
                    </span>
                    <h3 className="relative mt-3 text-lg font-semibold">{title}</h3>
                    <p className="relative mt-1 text-sm text-muted">{desc}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-navy p-7 text-white shadow-lift">
            <div>
              <h2 className="text-2xl font-bold">{h.ctaTitle}</h2>
              <p className="mt-1 text-white/70">{h.ctaLead}</p>
            </div>
            <Link href={`/${locale}/signin`} className="btn btn-lg">
              {h.demo}
            </Link>
          </section>
        </>
      ) : null}
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: { absolute: `${t.catalogue.title} · ${t.brand}` } };
}
