import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { Money } from "@/components/ui";

export type OrderRow = {
  no: string;
  buyer_code: string;
  seller_code: string;
  product_ref: string;
  title_en: string;
  title_ar: string;
  part_number: string;
  unit_price_piastres: number;
  quantity: number;
  total_piastres: number;
  commission_bps: number;
  commission_piastres: number;
  seller_net_piastres: number;
  status: string;
  waybill_no: string | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  closed_at: string | null;
};

export const ORDER_SELECT =
  "no, buyer_code, seller_code, product_ref, title_en, title_ar, part_number, unit_price_piastres, quantity, total_piastres, commission_bps, commission_piastres, seller_net_piastres, status, waybill_no, created_at, paid_at, shipped_at, closed_at";

const STATUS_PILL: Record<string, string> = {
  pending_payment: "pill-muted",
  paid_held: "pill-held",
  shipped: "pill-held",
  completed: "pill-ok",
  disputed: "pill-danger",
  refunded: "pill-muted",
  cancelled: "pill-muted",
};

export function StatusPill({ status, t }: { status: string; t: Dict }) {
  return <span className={`pill ${STATUS_PILL[status] ?? "pill-muted"}`}>{t.orders.status[status] ?? status}</span>;
}

/** The escrow timeline shown on every order. Each step has a label; state is never colour alone. */
export function EscrowTimeline({ order, t }: { order: OrderRow; t: Dict }) {
  const s = t.orders.steps;
  const paid = order.paid_at !== null;
  const shipped = order.shipped_at !== null;
  const done = order.status === "completed";
  const steps = [
    { title: s.paid, desc: s.paidDesc, done: paid },
    { title: s.shipped, desc: s.shippedDesc, done: shipped },
    { title: s.confirmed, desc: s.confirmedDesc, done },
    { title: s.released, desc: s.releasedDesc, done },
  ];
  const stopped = ["refunded", "cancelled"].includes(order.status);
  const current = stopped ? -1 : steps.findIndex((x) => !x.done);
  const held = ["paid_held", "shipped", "disputed"].includes(order.status);
  const note = t.orders.notes[order.status];

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t.orders.escrow}</h2>
        {held ? <span className="pill pill-held">{t.orders.held}</span> : <StatusPill status={order.status} t={t} />}
      </div>
      {note ? <p className="notice">{note}</p> : null}
      <ol className="space-y-0">
        {steps.map((step, i) => (
          <li key={i} className="relative pb-3.5 ps-8 last:pb-0">
            <span
              aria-hidden="true"
              className={`absolute start-0 top-1 h-4 w-4 rounded-full border-2 ${
                step.done ? "border-ok bg-ok" : i === current ? "border-accent bg-surface ring-4 ring-accent/20" : "border-line bg-surface"
              }`}
            />
            {i < steps.length - 1 ? <span aria-hidden="true" className={`absolute bottom-0 start-[7px] top-6 w-0.5 ${step.done ? "bg-ok" : "bg-line"}`} /> : null}
            <b className="font-semibold">
              {step.title}
              {step.done ? <span className="ms-1.5 text-ok">✓</span> : null}
            </b>
            <span className="block text-[13px] text-muted">{step.desc}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Compact order table for dashboards. `party` is the column that names the other side. */
export function OrdersTable({ orders, t, locale, party }: { orders: OrderRow[]; t: Dict; locale: Locale; party: "seller" | "buyer" | "both" }) {
  if (orders.length === 0) return <p className="card text-muted">{t.orders.none}</p>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="table" data-testid="orders-table">
        <thead>
          <tr>
            <th>{t.orders.order}</th>
            <th>{t.orders.part}</th>
            {party !== "buyer" ? <th>{t.seller.label}</th> : null}
            {party !== "seller" ? <th>{t.orders.buyer}</th> : null}
            <th>{t.orders.total}</th>
            <th>{t.admin.status}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.no}>
              <td className="code whitespace-nowrap font-medium">{o.no}</td>
              <td className="min-w-44">
                {pick(o, "title", locale)}
                <span className="code block text-xs text-muted">
                  {o.part_number} × {o.quantity}
                </span>
              </td>
              {party !== "buyer" ? <td className="code whitespace-nowrap">{o.seller_code}</td> : null}
              {party !== "seller" ? <td className="code whitespace-nowrap">{o.buyer_code}</td> : null}
              <td className="whitespace-nowrap">
                <Money piastres={o.total_piastres} locale={locale} />
              </td>
              <td>
                <StatusPill status={o.status} t={t} />
              </td>
              <td className="text-end">
                <Link href={`/${locale}/orders/${o.no}`} className="btn btn-ghost btn-sm">
                  {t.orders.actions.view}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrderHistory({ events, t, locale }: { events: { type: string; actor: string; created_at: string }[]; t: Dict; locale: Locale }) {
  return (
    <div className="card space-y-2">
      <h2 className="text-sm font-semibold">{t.orders.history.title}</h2>
      <ul className="space-y-1 text-sm">
        {events.map((e, i) => (
          <li key={i} className="flex flex-wrap justify-between gap-x-4">
            <span>
              {t.orders.history[e.type] ?? e.type} <span className="text-muted">· {t.orders.actors[e.actor] ?? e.actor}</span>
            </span>
            <span className="text-[13px] text-muted">{formatDateTime(e.created_at, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminNav({ locale, t, current }: { locale: Locale; t: Dict; current: "sellers" | "orders" | "money" | "moderation" }) {
  const items = [
    { key: "sellers", href: `/${locale}/admin`, label: t.adminNav.sellers },
    { key: "orders", href: `/${locale}/admin/orders`, label: t.adminNav.orders },
    { key: "money", href: `/${locale}/admin/money`, label: t.adminNav.money },
    { key: "moderation", href: `/${locale}/admin/moderation`, label: t.adminNav.moderation },
  ];
  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label={t.admin.title}>
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={`btn btn-sm ${i.key === current ? "" : "btn-ghost"}`} aria-current={i.key === current ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
