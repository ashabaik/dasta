import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { Money } from "@/components/ui";
import { mockPay } from "../../order-actions";

// Stands in for the payment provider's hosted checkout. Clearly labelled: no card, no real money.
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
    <div className="mx-auto mt-8 max-w-lg">
      <div className="rounded-md border-2 border-dashed border-held-line bg-surface p-5">
        <p className="pill pill-held">{t.demoNotice}</p>
        <h1 className="mt-3 text-xl font-semibold">{t.pay.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.pay.lead}</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">{t.orders.order}</dt>
          <dd className="code text-start">{order.no}</dd>
          <dt className="text-muted">{t.orders.part}</dt>
          <dd>
            {pick(order, "title", locale)} <span className="code text-muted">× {order.quantity}</span>
          </dd>
          <dt className="text-muted">{t.pay.amount}</dt>
          <dd className="text-lg font-semibold">
            <Money piastres={order.total_piastres} locale={locale} />
          </dd>
        </dl>
        <form action={mockPay} className="mt-5 flex flex-wrap gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="no" value={order.no} />
          <button type="submit" name="outcome" value="success" className="btn" data-testid="pay-success">
            {t.pay.succeed}
          </button>
          <button type="submit" name="outcome" value="fail" className="btn btn-ghost" data-testid="pay-fail">
            {t.pay.fail}
          </button>
        </form>
        <p className="mt-4 text-[13px] text-muted">{t.pay.how}</p>
      </div>
      <p className="mt-3 text-sm">
        <Link href={`/${locale}/orders/${order.no}`} className="text-steel">
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
