import { notFound } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/format";
import { CARD_SELECT, ProductCard, type CardProduct } from "@/components/ui";

export default async function SellerPublicPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const p0 = await params;
  const locale = asLocale(p0.locale);
  const t = getDict(locale);
  const supabase = await supabaseServer();

  // The sellers table holds public columns only. There is no name, phone or address to select here.
  const { data: seller } = await supabase.from("sellers").select("id, code, region, verified, joined_month, rating_avg, rating_count").eq("code", p0.code).eq("status", "active").maybeSingle();
  if (!seller) notFound();

  const [{ data: regions }, { data: products }] = await Promise.all([
    supabase.from("regions").select("key, name_en, name_ar"),
    supabase.from("products").select(CARD_SELECT).eq("seller_id", seller.id).eq("status", "active").order("ref"),
  ]);
  const regionNames = Object.fromEntries((regions ?? []).map((r) => [r.key, pick(r, "name", locale)]));
  const list = (products ?? []) as unknown as CardProduct[];

  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold">
        {t.seller.label} <span className="code">{seller.code}</span>
      </h1>
      <div className="card mt-4 space-y-2">
        <h2 className="text-sm font-semibold">{t.seller.publicProfile}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">{t.admin.code}</dt>
          <dd className="code text-start">{seller.code}</dd>
          <dt className="text-muted">{t.admin.region}</dt>
          <dd>{regionNames[seller.region]}</dd>
          <dt className="text-muted">{t.admin.verified}</dt>
          <dd>{seller.verified ? <span className="font-medium text-ok">✓ {t.seller.verified}</span> : t.seller.notVerified}</dd>
          <dt className="text-muted">{t.seller.memberSince}</dt>
          <dd>{formatMonth(seller.joined_month, locale)}</dd>
          <dt className="text-muted">{t.rating.label}</dt>
          <dd>
            {seller.rating_count > 0 ? (
              <>
                <span className="code">★ {Number(seller.rating_avg).toFixed(1)}</span> <span className="text-muted">({t.rating.count(seller.rating_count)})</span>
              </>
            ) : (
              <span className="text-muted">{t.rating.count(0)}</span>
            )}
          </dd>
        </dl>
        <p className="notice">{t.seller.publicProfileLead}</p>
      </div>

      <h2 className="h-section">{t.seller.listings(list.length)}</h2>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <ProductCard key={p.ref} p={p} t={t} locale={locale} regions={regionNames} />
        ))}
      </div>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: `${t.seller.label} ${p.code}` };
}
