import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import { formatDateTime, formatQty } from "@/lib/format";
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
  shipped: "pill-plain",
  completed: "pill-ok",
  disputed: "pill-danger",
  refunded: "pill-muted",
  cancelled: "pill-muted",
};

export function StatusPill({ status, t }: { status: string; t: Dict }) {
  return <span className={`pill ${STATUS_PILL[status] ?? "pill-muted"}`}>{t.orders.status[status] ?? status}</span>;
}

/** The order-protection timeline shown on every order. Each step has a label; state is never colour alone. */
export function ProtectionTimeline({ order, t }: { order: OrderRow; t: Dict }) {
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
        <h2 className="text-[15px] font-semibold">{t.orders.escrow}</h2>
        {held ? <span className="pill pill-held">{t.orders.held}</span> : <StatusPill status={order.status} t={t} />}
      </div>
      {note ? <p className="notice">{note}</p> : null}
      <ol className="space-y-0">
        {steps.map((step, i) => (
          <li key={i} className="relative pb-3.5 ps-8 last:pb-0">
            <span
              aria-hidden="true"
              className={`absolute start-0 top-1 h-4 w-4 rounded-full border-2 ${
                step.done ? "border-primary bg-primary" : i === current ? "border-primary bg-background ring-4 ring-primary/20" : "border-border bg-background"
              }`}
            />
            {i < steps.length - 1 ? <span aria-hidden="true" className={`absolute bottom-0 start-[7px] top-6 w-0.5 ${step.done ? "bg-primary" : "bg-border"}`} /> : null}
            <b className="font-semibold">
              {step.title}
              {step.done ? <span className="ms-1.5 text-primary">✓</span> : null}
            </b>
            <span className="block text-[13px] text-muted-foreground">{step.desc}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Orders as a list of rows for dashboards. `party` names which other side to show. */
export function OrdersTable({ orders, t, locale, party }: { orders: OrderRow[]; t: Dict; locale: Locale; party: "seller" | "buyer" | "both" }) {
  if (orders.length === 0) return <p className="card text-muted-foreground">{t.orders.none}</p>;
  return (
    <ul className="space-y-2.5" data-testid="orders-table">
      {orders.map((o) => (
        <li key={o.no} className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[22px] bg-card p-4 sm:px-5">
          <div className="min-w-0 flex-1 basis-full sm:basis-0">
            <Link href={`/${locale}/orders/${o.no}`} className="font-medium leading-snug underline-offset-4 hover:underline">
              {pick(o, "title", locale)}
            </Link>
            <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
              <span className="num">{o.no}</span>
              <span className="num">{formatQty(o.quantity)} ×</span>
              {party !== "buyer" ? <span className="num">{o.seller_code}</span> : null}
              {party !== "seller" ? <span className="num">{o.buyer_code}</span> : null}
            </p>
          </div>
          <Money piastres={o.total_piastres} locale={locale} className="text-[17px] font-semibold" />
          <span className="ms-auto sm:ms-0">
            <StatusPill status={o.status} t={t} />
          </span>
          <Link href={`/${locale}/orders/${o.no}`} className="btn btn-ghost btn-sm w-full sm:w-auto">
            {t.orders.actions.view}
          </Link>
        </li>
      ))}
    </ul>
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
              {t.orders.history[e.type] ?? e.type} <span className="text-muted-foreground">· {t.orders.actors[e.actor] ?? e.actor}</span>
            </span>
            <span className="text-[13px] text-muted-foreground">{formatDateTime(e.created_at, locale)}</span>
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
