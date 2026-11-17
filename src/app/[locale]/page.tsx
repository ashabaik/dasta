import Link from "next/link";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { CARD_SELECT, ProductCard, type CardProduct } from "@/components/ui";

const PAGE_SIZE = 12;
const CONDITIONS = ["new", "used", "refurbished"];

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CataloguePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 60);
  const cat = one(sp.cat);
  const cond = CONDITIONS.includes(one(sp.cond)) ? one(sp.cond) : "";
  const region = one(sp.region);
  const sort = one(sp.sort);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

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

  const link = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (cat) u.set("cat", cat);
    if (cond) u.set("cond", cond);
    if (region) u.set("region", region);
    if (sort) u.set("sort", sort);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/${locale}${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t.catalogue.title}</h1>
        <p className="text-sm text-muted">{t.tagline}</p>
      </div>

      <form action={`/${locale}`} className="card mt-4 grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
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
          <button type="submit" className="btn">
            {t.filters.apply}
          </button>
          <Link href={`/${locale}`} className="btn btn-ghost">
            {t.filters.clear}
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-muted" data-testid="result-count">
        {q ? (
          <>
            <span className="font-medium text-ink">&ldquo;{q}&rdquo;</span> ·{" "}
          </>
        ) : null}
        {t.catalogue.results(total)}
      </p>

      {products.length === 0 ? (
        <p className="card mt-3 text-muted">{t.catalogue.empty}</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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
            <Link href={link(page + 1)} className="btn btn-ghost">
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
