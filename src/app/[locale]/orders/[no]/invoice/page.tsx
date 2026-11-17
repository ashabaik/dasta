import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Logo, Money } from "@/components/ui";
import { ORDER_SELECT, type OrderRow } from "@/components/orders";

// The invoice carries the platform's name. The seller appears only as a supplier reference (their code).
export default async function InvoicePage({ params }: { params: Promise<{ locale: string; no: string }> }) {
  const p0 = await params;
  const locale = asLocale(p0.locale);
  const t = getDict(locale);
  const v = t.orders.invoice;
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/signin`);
  if (viewer.role === "seller") notFound();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("orders").select(ORDER_SELECT).eq("no", p0.no).maybeSingle();
  const order = data as unknown as OrderRow | null;
  if (!order || !order.paid_at) notFound();

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <p className="text-sm print:hidden">
        <Link href={`/${locale}/orders/${order.no}`} className="text-steel">
          <span className="arrow" aria-hidden="true">←</span> {v.back}
        </Link>
      </p>
      <article className="card mt-3 space-y-5 p-6" data-testid="invoice">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xl font-semibold">
            <Logo />
            {t.brand}
          </div>
          <div className="text-end">
            <h1 className="text-xl font-semibold">{v.title}</h1>
            <p className="code text-sm text-muted">{order.no}</p>
            <p className="text-[13px] text-muted">{formatDateTime(order.paid_at, locale)}</p>
          </div>
        </header>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">{v.issuedBy}</dt>
          <dd>{v.issuedByValue}</dd>
          <dt className="text-muted">{v.billedTo}</dt>
          <dd>
            {t.orders.buyer} <span className="code">{order.buyer_code}</span>
          </dd>
          <dt className="text-muted">{v.supplierRef}</dt>
          <dd className="code text-start">{order.seller_code}</dd>
        </dl>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t.orders.part}</th>
                <th>{t.orders.qty}</th>
                <th>{t.orders.unitPrice}</th>
                <th>{t.orders.total}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {pick(order, "title", locale)}
                  <span className="code block text-xs text-muted">{order.part_number}</span>
                </td>
                <td className="code">{order.quantity}</td>
                <td className="whitespace-nowrap">
                  <Money piastres={order.unit_price_piastres} locale={locale} />
                </td>
                <td className="whitespace-nowrap font-semibold">
                  <Money piastres={order.total_piastres} locale={locale} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="notice">{v.note}</p>
      </article>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; no: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: `${t.orders.invoice.title} ${p.no}` };
}
