import { asLocale, getDict } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Money } from "@/components/ui";
import { AdminNav } from "@/components/orders";
import { payoutSeller, setCommission } from "../../order-actions";

type Search = Record<string, string | string[] | undefined>;
type Overview = {
  captured: number;
  refunded: number;
  paid_out: number;
  commission: number;
  escrow_held: number;
  seller_payable: number;
  balanced: boolean;
  commission_bps: number;
};

export default async function AdminMoneyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const m = t.money;
  await requireRole(locale, "admin");
  const errorKey = String((await searchParams).error ?? "");
  const supabase = await supabaseServer();
  const [{ data: overview }, { data: payables }, { data: events }] = await Promise.all([
    supabase.rpc("admin_ledger_overview"),
    supabase.rpc("admin_seller_payables"),
    supabase.rpc("admin_webhook_events"),
  ]);
  const o = overview as Overview;
  const rows: [string, number][] = [
    [m.captured, o.captured],
    [m.refunded, o.refunded],
    [m.paidOut, o.paid_out],
    [m.commission, o.commission],
    [m.escrow, o.escrow_held],
    [m.owed, o.seller_payable],
  ];

  return (
    <>
      <h1 className="page-title">{t.admin.title}</h1>
      <AdminNav locale={locale} t={t} current="money" />
      {errorKey ? <p className="error mt-4">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}

      <h2 className="h-section">{m.ledger}</h2>
      <div className="card space-y-3" data-testid="ledger">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border border-s-4 border-s-primary bg-background/50 p-3.5">
              <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-bold">
                <Money piastres={value} locale={locale} />
              </dd>
            </div>
          ))}
        </dl>
        <p className={`pill ${o.balanced ? "pill-ok" : "pill-danger"} whitespace-normal`} data-testid="ledger-balanced">
          {o.balanced ? `✓ ${m.balanced}` : m.notBalanced}
        </p>
      </div>

      <h2 className="h-section">{m.payouts}</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table" data-testid="payables">
          <thead>
            <tr>
              <th>{t.admin.seller}</th>
              <th>{m.owed}</th>
              <th>{m.paidOut}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(payables ?? []).map((p: { seller_id: string; seller_code: string; payable_piastres: number; paid_out_piastres: number }) => (
              <tr key={p.seller_id}>
                <td className="code font-medium">{p.seller_code}</td>
                <td className="whitespace-nowrap">
                  <Money piastres={p.payable_piastres} locale={locale} />
                </td>
                <td className="whitespace-nowrap">
                  <Money piastres={p.paid_out_piastres} locale={locale} />
                </td>
                <td className="text-end">
                  {p.payable_piastres > 0 ? (
                    <form action={payoutSeller}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="seller_id" value={p.seller_id} />
                      <button type="submit" className="btn btn-sm" data-testid={`payout-${p.seller_code}`}>
                        {m.payout}
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">{m.payoutNote}</p>

      <h2 className="h-section">{m.commissionTitle}</h2>
      <form action={setCommission} className="card flex flex-wrap items-end gap-3">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label className="label" htmlFor="c-pct">
            {m.commissionLabel}
          </label>
          <input id="c-pct" name="percent" className="input code w-32" inputMode="decimal" defaultValue={String(o.commission_bps / 100)} required pattern="[0-9]{1,2}([.,][0-9]{1,2})?" />
        </div>
        <button type="submit" className="btn btn-ghost">
          {m.save}
        </button>
        <p className="basis-full text-[13px] text-muted-foreground">{m.commissionHint}</p>
      </form>

      <h2 className="h-section">{m.callbacks}</h2>
      {!events || events.length === 0 ? (
        <p className="card text-muted-foreground">{m.noCallbacks}</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>{t.admin.when}</th>
                <th>{m.event}</th>
                <th>{t.orders.order}</th>
                <th>{m.outcome}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e: { id: number; event_id: string; outcome: string; merchant_order_id: string | null; received_at: string }) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{formatDateTime(e.received_at, locale)}</td>
                  <td className="code">{e.event_id}</td>
                  <td className="code">{e.merchant_order_id ?? ""}</td>
                  <td>
                    <span className={`pill ${e.outcome === "captured" ? "pill-ok" : "pill-muted"}`}>
                      <span className="code">{e.outcome}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: `${t.titles.admin} · ${t.adminNav.money}` };
}
