import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { asLocale, getDict } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { ORDER_SELECT, OrdersTable, type OrderRow } from "@/components/orders";

// A working screen: no smooth-scroll layer, nothing held.
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
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-6 sm:pt-8">
        <h1 className="font-heading text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[44px] rtl:leading-[1.4]">{d.title}</h1>
        <p className="flex flex-wrap items-center gap-2.5 text-[15px]">
          <span className="text-muted-foreground">{d.yourCode}</span>
          <span className="num rounded-full bg-card px-3.5 py-1.5 font-semibold">{viewer.buyerCode}</span>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-accent p-5 sm:p-6">
        <p className="flex min-w-0 flex-1 basis-64 gap-3 text-[15px]">
          <ShieldCheck className="mt-0.5 size-[22px] shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="font-semibold">{t.product.orderProtection}.</span> {t.product.privacyNote} {d.codeHint}
          </span>
        </p>
        <Link href={`/${locale}?view=all`} className="btn">
          {d.browse}
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="font-heading text-[24px] font-bold tracking-tight sm:text-[30px] rtl:leading-[1.4]">{t.orders.title}</h2>
        <div className="mt-5">
          <OrdersTable orders={orders} t={t} locale={locale} party="seller" />
        </div>
      </section>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: t.titles.buyer };
}
