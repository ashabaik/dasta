import Link from "next/link";
import { notFound } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/format";
import { getViewer } from "@/lib/session";
import { createOrder } from "../../order-actions";
import { CARD_SELECT, CategoryArt, Money, ProductCard, SellerChip, SpecList, imageUrl, type CardProduct, type Spec } from "@/components/ui";

type Detail = CardProduct & {
  id: string;
  seller_id: string;
  description_en: string;
  description_ar: string;
  sellers: { code: string; region: string; verified: boolean; joined_month: string };
};

type Search = Record<string, string | string[] | undefined>;

export default async function ProductPage({ params, searchParams }: { params: Promise<{ locale: string; ref: string }>; searchParams: Promise<Search> }) {
  const p0 = await params;
  const errorKey = String((await searchParams).error ?? "");
  const viewer = await getViewer();
  const locale = asLocale(p0.locale);
  const t = getDict(locale);
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("products")
    .select(
      "id, seller_id, ref, title_en, title_ar, part_number, condition, specs, description_en, description_ar, price_piastres, stock, categories!inner(slug, name_en, name_ar), sellers!inner(code, region, verified, joined_month), product_images(path, sort)",
    )
    .eq("ref", p0.ref)
    .maybeSingle();
  if (!data) notFound();
  const p = data as unknown as Detail;

  const [{ data: regions }, { data: more }] = await Promise.all([
    supabase.from("regions").select("key, name_en, name_ar"),
    supabase.from("products").select(CARD_SELECT).eq("seller_id", p.seller_id).eq("status", "active").neq("ref", p.ref).order("ref").limit(3),
  ]);
  const regionNames = Object.fromEntries((regions ?? []).map((r) => [r.key, pick(r, "name", locale)]));
  const photos = [...p.product_images].sort((a, b) => a.sort - b.sort);
  const description = pick(p, "description", locale);

  return (
    <>
      <p className="mt-5 text-sm">
        <Link href={`/${locale}`} className="text-steel">
          ← {t.product.back}
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="aspect-[4/3] overflow-hidden rounded-md border border-line bg-tile">
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(photos[0].path)} alt={pick(p, "title", locale)} className="h-full w-full object-contain" />
            ) : (
              <CategoryArt slug={p.categories.slug} label={t.catalogue.noPhoto} />
            )}
          </div>
          {photos.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {photos.slice(1).map((ph) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={ph.path} src={imageUrl(ph.path)} alt="" className="aspect-square w-full rounded border border-line object-cover" loading="lazy" />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="code text-sm text-muted">{p.part_number}</span>
              <span className="tag">{t.condition[p.condition]}</span>
              <span className="tag">{pick(p.categories, "name", locale)}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">{pick(p, "title", locale)}</h1>
          </div>

          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Money piastres={p.price_piastres} locale={locale} className="text-2xl font-semibold" />
              <span className="tag">{p.stock > 0 ? t.catalogue.inStock(p.stock) : t.catalogue.outOfStock}</span>
            </div>
            {errorKey ? <p className="error">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}
            {viewer?.role === "buyer" && p.stock > 0 ? (
              <form action={createOrder} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="ref" value={p.ref} />
                <div>
                  <label className="label" htmlFor="o-qty">
                    {t.orders.qty}
                  </label>
                  <input id="o-qty" name="quantity" type="number" min={1} max={Math.min(p.stock, 1000)} defaultValue={1} className="input code w-24" required />
                </div>
                <button type="submit" className="btn" data-testid="order-now">
                  {t.orders.orderNow}
                </button>
              </form>
            ) : null}
            {!viewer && p.stock > 0 ? (
              <Link href={`/${locale}/signin`} className="btn btn-ghost">
                {t.orders.signInToOrder}
              </Link>
            ) : null}
          </div>

          <div className="card space-y-2">
            <h2 className="text-sm font-semibold">{t.product.soldBy}</h2>
            <SellerChip seller={p.sellers} regionName={regionNames[p.sellers.region] ?? ""} t={t} locale={locale} />
            <p className="text-[13px] text-muted">
              {t.seller.memberSince} {formatMonth(p.sellers.joined_month, locale)}
            </p>
            <p className="notice">{t.product.privacyNote}</p>
          </div>

          {(p.specs as Spec[]).length ? (
            <div className="card space-y-2">
              <h2 className="text-sm font-semibold">{t.product.specs}</h2>
              <SpecList specs={p.specs} locale={locale} />
            </div>
          ) : null}

          {description ? (
            <div className="card space-y-2">
              <h2 className="text-sm font-semibold">{t.product.description}</h2>
              <p className="whitespace-pre-line text-sm">{description}</p>
            </div>
          ) : null}
        </div>
      </div>

      {more && more.length ? (
        <>
          <h2 className="h-section">{t.product.moreFromSeller}</h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {(more as unknown as CardProduct[]).map((m) => (
              <ProductCard key={m.ref} p={m} t={t} locale={locale} regions={regionNames} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
