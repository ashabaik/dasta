import Link from "next/link";
import { asLocale, getDict } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { ORDER_SELECT, OrdersTable, type OrderRow } from "@/components/orders";

export default async function BuyerDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const viewer = await requireRole(locale, "buyer");
  const d = t.buyerDash;
  const supabase = await supabaseServer();
  // No buyer filter is needed here: row level security returns this buyer's orders only.
  const { data } = await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(50);
  const orders = (data ?? []) as unknown as OrderRow[];

  return (
    <>
      <h1 className="page-title">{d.title}</h1>
      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="space-y-2 rounded-xl bg-navy p-5 text-white shadow-lift">
          <h2 className="text-sm font-medium text-white/70">{d.yourCode}</h2>
          <p className="code text-4xl font-bold tracking-tight">{viewer.buyerCode}</p>
          <p className="text-[13px] text-white/65">{d.codeHint}</p>
        </div>
        <div className="card flex flex-col items-start justify-center gap-3">
          <p className="text-sm text-muted">{t.product.privacyNote}</p>
          <Link href={`/${locale}`} className="btn">
            {d.browse}
          </Link>
        </div>
      </div>
      <h2 className="h-section">{t.orders.title}</h2>
      <OrdersTable orders={orders} t={t} locale={locale} party="seller" />
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: t.titles.buyer };
}
