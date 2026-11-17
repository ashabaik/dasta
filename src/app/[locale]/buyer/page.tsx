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
      <h1 className="mt-6 text-2xl font-semibold">{d.title}</h1>
      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold">{d.yourCode}</h2>
          <p className="code text-2xl font-semibold">{viewer.buyerCode}</p>
          <p className="text-[13px] text-muted">{d.codeHint}</p>
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
