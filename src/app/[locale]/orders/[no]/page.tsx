import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Money } from "@/components/ui";
import { EscrowTimeline, ORDER_SELECT, OrderHistory, StatusPill, type OrderRow } from "@/components/orders";
import { orderStep } from "../../order-actions";
import { openThread } from "../../chat-actions";

type Search = Record<string, string | string[] | undefined>;

function Step({ locale, no, step, label, kind = "", children }: { locale: string; no: string; step: string; label: string; kind?: string; children?: React.ReactNode }) {
  return (
    <form action={orderStep} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="no" value={no} />
      <input type="hidden" name="step" value={step} />
      {children}
      <button type="submit" className={`btn ${kind}`} data-testid={`step-${step}`}>
        {label}
      </button>
    </form>
  );
}

// One page for the buyer, the seller and the admin. Row level security decides whether the order is
// visible at all; the viewer's role decides which buttons are shown; the database functions decide
// whether a pressed button is allowed.
export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: string; no: string }>; searchParams: Promise<Search> }) {
  const p0 = await params;
  const locale = asLocale(p0.locale);
  const t = getDict(locale);
  const o = t.orders;
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/signin`);
  const errorKey = String((await searchParams).error ?? "");
  const supabase = await supabaseServer();

  const { data } = await supabase.from("orders").select(`id, ${ORDER_SELECT}`).eq("no", p0.no).maybeSingle();
  if (!data) notFound();
  const order = data as unknown as OrderRow & { id: string };
  const [{ data: events }, { data: dispute }] = await Promise.all([
    supabase.from("order_events").select("type, actor, created_at").eq("order_id", order.id).order("id"),
    supabase.from("disputes").select("reason_code, status, opened_at, resolved_at").eq("order_id", order.id).maybeSingle(),
  ]);
  const notes = viewer.role === "admin" && dispute ? ((await supabase.rpc("admin_dispute_notes", { p_no: order.no })).data ?? []) : [];

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {o.order} <span className="code">{order.no}</span>
        </h1>
        <StatusPill status={order.status} t={t} />
      </div>
      <p className="mt-1 text-[13px] text-muted">{formatDateTime(order.created_at, locale)}</p>
      {errorKey ? <p className="error mt-4">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}

      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="space-y-3.5">
          <div className="card space-y-3">
            <div>
              <span className="code text-[12.5px] text-muted">{order.part_number}</span>
              <h2 className="text-base font-semibold">
                <Link href={`/${locale}/p/${order.product_ref}`} className="text-ink no-underline hover:underline">
                  {pick(order, "title", locale)}
                </Link>
              </h2>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">{o.unitPrice}</dt>
              <dd className="text-end">
                <Money piastres={order.unit_price_piastres} locale={locale} />
              </dd>
              <dt className="text-muted">{o.qty}</dt>
              <dd className="code text-end">{order.quantity}</dd>
              <dt className="font-semibold">{o.total}</dt>
              <dd className="text-end font-semibold">
                <Money piastres={order.total_piastres} locale={locale} />
              </dd>
              {viewer.role !== "buyer" ? (
                <>
                  <dt className="text-muted">
                    {o.commission} (<span className="code">{order.commission_bps / 100}%</span>)
                  </dt>
                  <dd className="text-end">
                    <Money piastres={order.commission_piastres} locale={locale} />
                  </dd>
                  <dt className="text-muted">{o.sellerNet}</dt>
                  <dd className="text-end">
                    <Money piastres={order.seller_net_piastres} locale={locale} />
                  </dd>
                </>
              ) : null}
            </dl>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-dashed border-line pt-3 text-sm">
              {viewer.role !== "seller" ? (
                <>
                  <dt className="text-muted">{t.seller.label}</dt>
                  <dd className="code text-start">{order.seller_code}</dd>
                </>
              ) : null}
              {viewer.role !== "buyer" ? (
                <>
                  <dt className="text-muted">{o.buyer}</dt>
                  <dd className="code text-start">{order.buyer_code}</dd>
                </>
              ) : null}
            </dl>
          </div>

          {order.waybill_no ? (
            <div className="card space-y-2" data-testid="waybill">
              <h2 className="text-sm font-semibold">{o.waybill.title}</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted">{o.waybill.number}</dt>
                <dd className="code text-start">{order.waybill_no}</dd>
                <dt className="text-muted">{o.waybill.shipper}</dt>
                <dd>{o.waybill.shipperValue}</dd>
                <dt className="text-muted">{o.waybill.consignee}</dt>
                <dd>{o.waybill.consigneeValue(order.buyer_code)}</dd>
              </dl>
            </div>
          ) : null}

          {dispute ? (
            <div className="card space-y-2" data-testid="dispute">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{o.dispute.title}</h2>
                <span className={`pill ${dispute.status === "open" ? "pill-danger" : "pill-muted"}`}>{o.dispute.status[dispute.status]}</span>
              </div>
              <p className="text-sm">
                <span className="text-muted">{o.dispute.reason}:</span> {o.dispute.reasons[dispute.reason_code]}
              </p>
              {notes.length ? (
                <div className="rounded border border-held-line bg-held-bg p-2.5 text-sm">
                  <h3 className="text-[13px] font-semibold text-held">{o.dispute.adminNotes}</h3>
                  <ul className="mt-1 space-y-1">
                    {notes.map((n: { author: string; note: string }, i: number) => (
                      <li key={i}>
                        <span className="text-muted">{o.actors[n.author]}:</span> {n.note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-3.5">
          <EscrowTimeline order={order} t={t} />

          <div className="card space-y-3" data-testid="order-actions">
            {viewer.role === "buyer" && order.status === "pending_payment" ? (
              <div className="flex flex-wrap gap-2">
                <Link href={`/${locale}/pay/${order.no}`} className="btn" data-testid="go-pay">
                  {o.actions.pay}
                </Link>
                <Step locale={locale} no={order.no} step="cancel" label={o.actions.cancel} kind="btn-ghost" />
              </div>
            ) : null}
            {viewer.role === "buyer" && order.status === "paid_held" ? <Step locale={locale} no={order.no} step="cancel" label={o.actions.cancelRefund} kind="btn-ghost" /> : null}
            {viewer.role === "buyer" && order.status === "shipped" ? (
              <>
                <Step locale={locale} no={order.no} step="confirm" label={o.actions.confirm} />
                <details>
                  <summary className="cursor-pointer text-sm text-steel">{o.actions.dispute}</summary>
                  <div className="mt-2">
                    <Step locale={locale} no={order.no} step="dispute" label={o.actions.dispute} kind="btn-danger">
                      <div className="w-full">
                        <label className="label" htmlFor="d-reason">
                          {o.dispute.reason}
                        </label>
                        <select id="d-reason" name="reason" className="input" required>
                          {Object.entries(o.dispute.reasons).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full">
                        <label className="label" htmlFor="d-note">
                          {o.dispute.note}
                        </label>
                        <textarea id="d-note" name="note" rows={2} maxLength={1000} className="input" />
                      </div>
                    </Step>
                  </div>
                </details>
              </>
            ) : null}
            {viewer.role === "seller" && order.status === "paid_held" ? <Step locale={locale} no={order.no} step="ship" label={o.actions.ship} /> : null}
            {viewer.role === "admin" && order.status === "disputed" ? (
              <div className="space-y-2">
                <Step locale={locale} no={order.no} step="resolve-release" label={o.actions.resolveRelease}>
                  <div className="w-full">
                    <label className="label" htmlFor="a-note1">
                      {o.dispute.decisionNote}
                    </label>
                    <input id="a-note1" name="note" maxLength={1000} className="input" />
                  </div>
                </Step>
                <Step locale={locale} no={order.no} step="resolve-refund" label={o.actions.resolveRefund} kind="btn-danger" />
              </div>
            ) : null}
            {viewer.role !== "seller" && order.paid_at ? (
              <Link href={`/${locale}/orders/${order.no}/invoice`} className="btn btn-ghost self-start">
                {o.actions.invoice}
              </Link>
            ) : null}
            {viewer.role === "buyer" ? (
              <form action={openThread}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="ref" value={order.product_ref} />
                <button type="submit" className="btn btn-ghost">
                  {t.chat.messageSeller}
                </button>
              </form>
            ) : null}
            {viewer.role === "seller" ? (
              <Link href={`/${locale}/messages`} className="btn btn-ghost self-start">
                {t.chat.title}
              </Link>
            ) : null}
            <p className="text-[13px] text-muted">{t.product.privacyNote}</p>
          </div>

          <OrderHistory events={events ?? []} t={t} locale={locale} />
        </div>
      </div>
    </>
  );
}
