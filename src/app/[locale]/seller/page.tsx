import Link from "next/link";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { Money } from "@/components/ui";
import { ORDER_SELECT, OrdersTable, type OrderRow } from "@/components/orders";
import { sellerOnboard } from "../actions";

type Search = Record<string, string | string[] | undefined>;

export default async function SellerDashboard({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const viewer = await requireRole(locale, "seller");
  const errorKey = String((await searchParams).error ?? "");
  const error = errorKey ? ((t.errors as Record<string, string>)[errorKey] ?? t.errors.generic) : "";
  const supabase = await supabaseServer();

  // ---- Not onboarded yet: the onboarding form ----
  if (!viewer.sellerId) {
    const { data: regions } = await supabase.from("regions").select("key, name_en, name_ar").order("name_en");
    const f = t.onboarding;
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mt-8 text-2xl font-semibold">{f.title}</h1>
        <p className="mt-2 text-muted">{f.lead}</p>
        <p className="notice mt-4">{f.demoWarning}</p>
        {error ? <p className="error mt-4">{error}</p> : null}
        <form action={sellerOnboard} className="mt-5 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <fieldset className="card space-y-3">
            <legend className="px-1 text-sm font-semibold text-ok">{f.publicTitle}</legend>
            <p className="text-[13px] text-muted">{f.publicLead}</p>
            <div>
              <label className="label" htmlFor="o-region">
                {f.region}
              </label>
              <select id="o-region" name="region" className="input" defaultValue="cairo" required>
                {(regions ?? []).map((r) => (
                  <option key={r.key} value={r.key}>
                    {pick(r, "name", locale)}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <fieldset className="card space-y-3">
            <legend className="px-1 text-sm font-semibold text-held">{f.privateTitle}</legend>
            <p className="text-[13px] text-muted">{f.privateLead}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["legal_name", f.legalName, "Sample New Seller Trading (fictional)", "text"],
                  ["contact_name", f.contactName, "Sample Contact", "text"],
                  ["phone", f.phone, "+20 000 000 0199", "tel"],
                  ["email", f.email, "contact@makbas.example", "email"],
                  ["address", f.address, "Plot 99, Sample Industrial Zone (fictional)", "text"],
                  ["tax_id", f.taxId, "000-000-199", "text"],
                  ["bank_name", f.bankName, "Sample Bank (fictional)", "text"],
                  ["iban", f.iban, "EG00 0000 0000 0000 0000 0000 0199", "text"],
                ] as const
              ).map(([name, label, sample, type]) => (
                <div key={name}>
                  <label className="label" htmlFor={`o-${name}`}>
                    {label}
                  </label>
                  <input id={`o-${name}`} name={name} type={type} className="input" dir="ltr" defaultValue={sample} maxLength={120} required={!["tax_id", "bank_name", "iban"].includes(name)} />
                </div>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="btn">
            {f.submit}
          </button>
        </form>
      </div>
    );
  }

  // ---- Onboarded: dashboard ----
  const d = t.sellerDash;
  const [{ data: products }, { data: identity }, { data: finance }, { data: orderRows }] = await Promise.all([
    supabase.from("products").select("ref, title_en, title_ar, part_number, price_piastres, stock, status").eq("seller_id", viewer.sellerId).order("part_number"),
    supabase.rpc("seller_my_identity"),
    supabase.rpc("seller_finance"),
    // Row level security returns only this seller's paid orders.
    supabase.from("orders").select(ORDER_SELECT).eq("seller_id", viewer.sellerId).order("created_at", { ascending: false }).limit(50),
  ]);
  const money = finance?.[0] ?? { held_piastres: 0, payable_piastres: 0, paid_out_piastres: 0, commission_bps: 0 };
  const orders = (orderRows ?? []) as unknown as OrderRow[];
  const list = products ?? [];
  const full = list.length >= 10;
  const status = viewer.sellerStatus ?? "pending";
  const me = identity?.[0];
  const o = t.onboarding;

  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold">{d.title}</h1>
      {error ? <p className="error mt-4">{error}</p> : null}

      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold">{d.yourCode}</h2>
          <p className="code text-2xl font-semibold">{viewer.sellerCode}</p>
          <p className="text-[13px] text-muted">{d.codeHint}</p>
          <p>
            <span className={`pill ${status === "active" ? "pill-ok" : status === "pending" ? "pill-held" : "pill-danger"}`}>{d.status[status]}</span>
          </p>
          <p className="text-[13px] text-muted">{d.statusHelp[status]}</p>
        </div>
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold">
            {d.identityTitle} <span className="font-normal text-steel">({d.view})</span>
          </summary>
          <p className="mt-2 text-[13px] text-muted">{d.identityLead}</p>
          {me ? (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" data-testid="own-identity">
              {(
                [
                  [o.legalName, me.legal_name],
                  [o.contactName, me.contact_name],
                  [o.phone, me.phone],
                  [o.email, me.email],
                  [o.address, me.address],
                  [o.taxId, me.tax_id],
                  [o.bankName, me.bank_name],
                  [o.iban, me.iban],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd dir="ltr" className="text-start">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </details>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t.money.balance}</h2>
        <span className="pill pill-muted">{t.money.commissionRate(String(money.commission_bps / 100))}</span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="seller-balance">
        {(
          [
            [t.money.held, money.held_piastres],
            [t.money.payable, money.payable_piastres],
            [t.money.paidOut, money.paid_out_piastres],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold">
              <Money piastres={value} locale={locale} />
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-6 text-lg font-semibold">{t.orders.title}</h2>
      <div className="mt-3">
        <OrdersTable orders={orders} t={t} locale={locale} party="buyer" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{d.products}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`pill ${full ? "pill-held" : "pill-muted"}`} data-testid="listing-count">
            {d.used(list.length)}
          </span>
          {full ? null : (
            <Link href={`/${locale}/seller/products/new`} className="btn">
              {d.add}
            </Link>
          )}
        </div>
      </div>
      {full ? <p className="notice mt-3">{d.limitReached}</p> : null}

      {list.length === 0 ? (
        <p className="card mt-3 text-muted">{d.none}</p>
      ) : (
        <div className="card mt-3 overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>{t.product.partNumber}</th>
                <th>{t.productForm.titleEn.replace(/\s*\(.*\)/, "")}</th>
                <th>{t.product.price}</th>
                <th>{t.product.stock}</th>
                <th>{t.productForm.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.ref}>
                  <td className="code whitespace-nowrap">
                    <Link href={`/${locale}/seller/products/${p.ref}`} className="text-steel">
                      {p.part_number}
                    </Link>
                  </td>
                  <td className="min-w-48">{pick(p, "title", locale)}</td>
                  <td className="whitespace-nowrap">
                    <Money piastres={p.price_piastres} locale={locale} />
                  </td>
                  <td className="code">{p.stock}</td>
                  <td>
                    <span className={`pill ${p.status === "active" ? "pill-ok" : p.status === "paused" ? "pill-muted" : "pill-held"}`}>
                      {p.status === "active" ? t.productForm.statusActive : p.status === "paused" ? t.productForm.statusPaused : t.productForm.statusFlagged}
                    </span>
                  </td>
                  <td className="text-end">
                    <Link href={`/${locale}/seller/products/${p.ref}`} className="btn btn-ghost btn-sm">
                      {d.edit}
                    </Link>
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
  return { title: t.titles.seller };
}
