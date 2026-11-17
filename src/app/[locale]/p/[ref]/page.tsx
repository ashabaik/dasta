import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { currencyLabel, formatMonth, formatQty } from "@/lib/format";
import { getViewer } from "@/lib/session";
import { createOrder } from "../../order-actions";
import { openThread } from "../../chat-actions";
import { CARD_SELECT, Money, ProductCard, SellerChip, SpecList, imageUrl, type CardProduct, type Spec } from "@/components/ui";
import { OrderPanel } from "@/components/order-panel";

type Detail = CardProduct & {
  id: string;
  seller_id: string;
  status: string;
  specs: Spec[];
  description_en: string;
  description_ar: string;
  sellers: { code: string; region: string; verified: boolean; status: string; joined_month: string; rating_avg: number | null; rating_count: number };
};

type Search = Record<string, string | string[] | undefined>;

// A working screen: light and fast. No smooth-scroll layer, nothing held; the only movement is the
// photograph arriving from the list and the answers to what the visitor does.
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
      "id, seller_id, status, ref, title_en, title_ar, part_number, specs, description_en, description_ar, price_piastres, stock, unit_en, unit_ar, min_order_qty, lead_days, price_breaks, listed_on, category_id, categories!inner(slug, name_en, name_ar), sellers!inner(code, region, verified, status, joined_month, rating_avg, rating_count), product_images(path, sort)",
    )
    .eq("ref", p0.ref)
    .maybeSingle();
  if (!data) notFound();
  const p = data as unknown as Detail & { category_id: number };

  const [{ data: regions }, { data: more }] = await Promise.all([
    supabase.from("regions").select("key, name_en, name_ar"),
    supabase.from("products").select(CARD_SELECT).eq("category_id", p.category_id).eq("status", "active").eq("sellers.status", "active").neq("ref", p.ref).order("listed_on", { ascending: false }).order("ref").limit(4),
  ]);
  const regionNames = Object.fromEntries((regions ?? []).map((r) => [r.key, pick(r, "name", locale)]));
  // A product's gallery holds only its own photographs. With one photograph, one is shown.
  const photos = [...p.product_images].sort((a, b) => a.sort - b.sort);
  const description = pick(p, "description", locale);
  const unit = pick(p, "unit", locale);
  const visible = p.status === "active" && p.sellers.status === "active";
  const inStock = p.stock >= p.min_order_qty;
  const category = pick(p.categories, "name", locale);

  return (
    <>
      <div className="grid grid-cols-1 gap-7 pt-2 lg:grid-cols-2 lg:gap-16 lg:pt-8">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-muted">
            {photos[0] ? (
              <ViewTransition name={`photo-${p.ref}`} share="morph" default="none">
                <Image src={imageUrl(photos[0].path)} alt={pick(p, "title", locale)} fill preload sizes="(min-width: 1024px) 572px, 100vw" className="object-cover" />
              </ViewTransition>
            ) : null}
          </div>
          {photos.length > 1 ? (
            <ul className="mt-3 grid grid-cols-4 gap-3">
              {photos.slice(1).map((ph) => (
                <li key={ph.path} className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                  <Image src={imageUrl(ph.path)} alt="" fill sizes="140px" className="object-cover" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <Link href={`/${locale}?cat=${p.categories.slug}`} className="tag bg-card hover:bg-accent hover:text-accent-foreground">
                {category}
              </Link>
              <span className="text-[13px] text-muted-foreground">
                {t.product.partNumber} <span className="num">{p.part_number}</span>
              </span>
            </p>
            <h1 className="mt-3 font-heading text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[46px] rtl:leading-[1.4]" style={{ textWrap: "balance" }}>
              {pick(p, "title", locale)}
            </h1>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-[28px] font-semibold leading-none sm:text-[34px]">
              <Money piastres={p.price_piastres} locale={locale} />
              <span className="text-[16px] font-normal text-muted-foreground">/ {unit}</span>
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-muted-foreground">
              <span>
                {t.product.moq} <span className="num text-foreground">{formatQty(p.min_order_qty)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-[18px]" aria-hidden="true" />
                {t.product.lead(p.lead_days)}
              </span>
              <span>{inStock ? t.catalogue.inStock(p.stock) : t.catalogue.outOfStock}</span>
            </p>
          </div>

          {!visible ? <p className="notice">{t.product.hidden}</p> : null}
          {errorKey ? <p className="error">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}

          <OrderPanel
            productRef={p.ref}
            locale={locale}
            base={p.price_piastres}
            breaks={p.price_breaks ?? []}
            moq={p.min_order_qty}
            stock={p.stock}
            canOrder={viewer?.role === "buyer" && visible && inStock}
            createOrder={createOrder}
            openThread={openThread}
            labels={{
              priceBreaks: t.product.priceBreaks,
              priceBreaksHint: t.product.priceBreaksHint,
              quantity: t.product.quantity,
              decrease: t.product.decrease,
              increase: t.product.increase,
              order: t.product.addToOrder,
              message: t.product.message,
              currency: currencyLabel(locale),
              unit,
              moq: t.product.moq,
            }}
          />
          {!viewer && visible && inStock ? (
            <Link href={`/${locale}/signin`} className="btn min-h-12 text-base">
              {t.orders.signInToOrder}
            </Link>
          ) : null}

          <div className="flex gap-3.5 rounded-[22px] bg-accent p-4 text-[15px] sm:p-5">
            <ShieldCheck className="mt-0.5 size-[22px] shrink-0 text-primary" aria-hidden="true" />
            <p>
              <span className="font-semibold">{t.product.orderProtection}.</span> {t.product.privacyNote}
            </p>
          </div>

          <div>
            <SellerChip seller={p.sellers} regionName={regionNames[p.sellers.region] ?? ""} t={t} locale={locale} />
            <p className="mt-2 text-sm text-muted-foreground">
              {t.seller.memberSince} {formatMonth(p.sellers.joined_month, locale)}
            </p>
          </div>

          {p.specs.length ? (
            <div>
              <h2 className="mb-2 text-[15px] font-semibold">{t.product.specs}</h2>
              <SpecList specs={p.specs} locale={locale} />
            </div>
          ) : null}

          {description ? (
            <div>
              <h2 className="text-[15px] font-semibold">{t.product.description}</h2>
              <p className="mt-1.5 max-w-[60ch] whitespace-pre-line text-muted-foreground">{description}</p>
            </div>
          ) : null}
        </div>
      </div>

      {more && more.length ? (
        <section className="mt-20 sm:mt-28">
          <h2 className="font-heading text-[26px] font-bold tracking-tight sm:text-[34px] rtl:leading-[1.4]">{t.product.moreIn(category)}</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
            {(more as unknown as CardProduct[]).map((m) => (
              <ProductCard key={m.ref} p={m} t={t} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; ref: string }> }) {
  const p = await params;
  const locale = asLocale(p.locale);
  const supabase = await supabaseServer();
  const { data } = await supabase.from("products").select("title_en, title_ar").eq("ref", p.ref).maybeSingle();
  return { title: data ? pick(data, "title", locale) : getDict(locale).errors.notFound };
}
