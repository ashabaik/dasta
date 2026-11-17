import { notFound } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/format";
import { CARD_SELECT, ProductCard, SellerChip, type CardProduct } from "@/components/ui";

export default async function SellerPublicPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const p0 = await params;
  const locale = asLocale(p0.locale);
  const t = getDict(locale);
  const supabase = await supabaseServer();

  // The suppliers table holds public columns only. There is no name, phone or address to select here.
  const { data: seller } = await supabase.from("sellers").select("id, code, region, verified, joined_month, rating_avg, rating_count").eq("code", p0.code).eq("status", "active").maybeSingle();
  if (!seller) notFound();

  const [{ data: regions }, { data: products }] = await Promise.all([
    supabase.from("regions").select("key, name_en, name_ar"),
    supabase.from("products").select(CARD_SELECT).eq("seller_id", seller.id).eq("status", "active").order("listed_on", { ascending: false }).order("ref"),
  ]);
  const regionNames = Object.fromEntries((regions ?? []).map((r) => [r.key, pick(r, "name", locale)]));
  const list = (products ?? []) as unknown as CardProduct[];

  return (
    <>
      <div className="pt-6 sm:pt-8">
        <p className="text-[15px] text-muted-foreground">{t.seller.publicProfile}</p>
        <h1 className="mt-1 font-heading text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[44px] rtl:leading-[1.4]">
          {t.seller.label} <span className="num">{seller.code}</span>
        </h1>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-[22px] bg-card p-5 sm:p-6">
        <SellerChip seller={seller} regionName={regionNames[seller.region] ?? ""} t={t} locale={locale} link={false} />
        <p className="text-[15px] text-muted-foreground">
          {t.seller.memberSince} {formatMonth(seller.joined_month, locale)}
        </p>
      </div>
      <p className="mt-3 max-w-[70ch] text-[15px] text-muted-foreground">{t.seller.publicProfileLead}</p>

      <h2 className="h-section">{t.seller.listings(list.length)}</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
        {list.map((p) => (
          <ProductCard key={p.ref} p={p} t={t} locale={locale} />
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
