import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { Money } from "@/components/ui";
import { mockPay } from "../../order-actions";

// Stands in for the payment provider's hosted checkout. The first thing on it says so: test mode,
// no card is charged, no real money moves.
export default async function MockPayPage({ params }: { params: Promise<{ locale: string; no: string }> }) {
  const p0 = await params;
  const locale = asLocale(p0.locale);
  const t = getDict(locale);
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "buyer") redirect(`/${locale}/signin`);
  const supabase = await supabaseServer();
  const { data: order } = await supabase.from("orders").select("no, title_en, title_ar, part_number, quantity, total_piastres, status").eq("no", p0.no).maybeSingle();
  if (!order) notFound();
  if (order.status !== "pending_payment") redirect(`/${locale}/orders/${order.no}`);

  return (
    <div className="mx-auto mt-8 max-w-xl">
      <div className="card">
        <h1 className="flex flex-wrap items-center gap-3 font-heading text-[28px] font-bold tracking-tight">
          {t.pay.title}
          <span className="pill pill-held" data-testid="test-mode">
            {t.pay.testMode}
          </span>
        </h1>
        <p className="notice mt-4">{t.pay.lead}</p>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
          <dt className="text-muted-foreground">{t.orders.order}</dt>
          <dd className="code text-start">{order.no}</dd>
          <dt className="text-muted-foreground">{t.orders.part}</dt>
          <dd>
            {pick(order, "title", locale)} <span className="code text-muted-foreground">× {order.quantity}</span>
          </dd>
          <dt className="text-muted-foreground">{t.pay.amount}</dt>
          <dd className="text-[22px] font-semibold">
            <Money piastres={order.total_piastres} locale={locale} />
          </dd>
        </dl>
        <form action={mockPay} className="mt-6 flex flex-wrap gap-2.5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="no" value={order.no} />
          <button type="submit" name="outcome" value="success" className="btn min-h-12" data-testid="pay-success">
            {t.pay.succeed}
          </button>
          <button type="submit" name="outcome" value="fail" className="btn btn-ghost min-h-12" data-testid="pay-fail">
            {t.pay.fail}
          </button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">{t.pay.how}</p>
      </div>
      <p className="mt-4 text-[15px]">
        <Link href={`/${locale}/orders/${order.no}`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline underline-offset-4">
          <span className="arrow" aria-hidden="true">←</span> {t.pay.back}
        </Link>
      </p>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; no: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: `${t.titles.pay} ${p.no}` };
}
