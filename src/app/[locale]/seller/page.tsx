import Link from "next/link";
import { Plus, ShieldCheck, Truck, Wallet } from "lucide-react";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatQty } from "@/lib/format";
import { Money } from "@/components/ui";
import { Button } from "@/components/shadcn/button";
import { ORDER_SELECT, OrdersTable, type OrderRow } from "@/components/orders";
import { sellerOnboard } from "../actions";

type Search = Record<string, string | string[] | undefined>;

// A working screen: no smooth-scroll layer, nothing held. Motion only answers an action.
export default async function SellerDashboard({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const viewer = await requireRole(locale, "seller");
  const errorKey = String((await searchParams).error ?? "");
  const error = errorKey ? ((t.errors as Record<string, string>)[errorKey] ?? t.errors.generic) : "";
  const supabase = await supabaseServer();

  // ---- No supplier account yet: open one ----
  if (!viewer.sellerId) {
    const { data: regions } = await supabase.from("regions").select("key, name_en, name_ar").order("name_en");
    const f = t.onboarding;
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="page-title">{f.title}</h1>
        <p className="mt-2 text-muted-foreground">{f.lead}</p>
        {/* Said before any field: nothing real belongs in this form, and everything is wiped nightly. */}
        <p className="notice mt-5">{f.sampleWarning}</p>
        {error ? <p className="error mt-4">{error}</p> : null}
        <form action={sellerOnboard} className="mt-6 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <fieldset className="card space-y-3">
            <legend className="float-start mb-1 w-full font-heading text-[20px] font-bold">{f.publicTitle}</legend>
            <p className="clear-both text-[15px] text-muted-foreground">{f.publicLead}</p>
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
            <legend className="float-start mb-1 w-full font-heading text-[20px] font-bold">{f.privateTitle}</legend>
            <p className="clear-both text-[15px] text-muted-foreground">{f.privateLead}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  ["legal_name", f.legalName, "Sample New Supplier Trading (sample)", "text"],
                  ["contact_name", f.contactName, "Sample Contact", "text"],
                  ["phone", f.phone, "+20 000 000 0199", "tel"],
                  ["email", f.email, "contact@dasta.example", "email"],
                  ["address", f.address, "Unit 99, Sample Trade Park (sample)", "text"],
                  ["tax_id", f.taxId, "000-000-199", "text"],
                  ["bank_name", f.bankName, "Sample Bank (sample)", "text"],
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
          <button type="submit" className="btn min-h-12 text-base">
            {f.submit}
          </button>
        </form>
      </div>
    );
  }

  // ---- Dashboard ----
  const d = t.sellerDash;
  const [{ data: products }, { data: identity }, { data: finance }, { data: orderRows }] = await Promise.all([
    supabase.from("products").select("ref, title_en, title_ar, part_number, price_piastres, stock, status, min_order_qty").eq("seller_id", viewer.sellerId).order("part_number"),
    supabase.rpc("seller_my_identity"),
    supabase.rpc("seller_finance"),
    // Row level security returns only this supplier's paid orders.
    supabase.from("orders").select(ORDER_SELECT).eq("seller_id", viewer.sellerId).order("created_at", { ascending: false }).limit(50),
  ]);
  const money = finance?.[0] ?? { held_piastres: 0, payable_piastres: 0, paid_out_piastres: 0, commission_bps: 0 };
  const orders = (orderRows ?? []) as unknown as OrderRow[];
  const list = products ?? [];
  const full = list.length >= 10;
  const status = viewer.sellerStatus ?? "pending";
  const me = identity?.[0];
  const o = t.onboarding;
  // Every figure is counted from the rows above or returned by the ledger.
  const awaiting = orders.filter((x) => x.status === "paid_held").length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-6 sm:pt-8">
        <div>
          <p className="text-[15px] text-muted-foreground">{d.title}</p>
          <h1 className="mt-1 font-heading text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[44px] rtl:leading-[1.4]">{d.hello}</h1>
        </div>
        <p className="flex flex-wrap items-center gap-2.5 text-[15px]">
          <span className="text-muted-foreground">{d.yourCode}</span>
          <span className="num rounded-full bg-card px-3.5 py-1.5 font-semibold">{viewer.sellerCode}</span>
          <span className={`pill ${status === "active" ? "pill-ok" : status === "pending" ? "pill-held" : "pill-danger"}`}>{d.status[status]}</span>
        </p>
      </div>
      {error ? <p className="error mt-4">{error}</p> : null}
      {status !== "active" ? <p className="notice mt-4">{d.statusHelp[status]}</p> : null}

      <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="seller-balance">
        <div className="rounded-[22px] bg-foreground p-5 text-background sm:p-6">
          <dt className="flex items-center gap-2 text-[15px] text-background/80">
            <Truck className="size-[18px]" aria-hidden="true" />
            {d.awaiting}
          </dt>
          <dd className="num mt-3 font-heading text-[40px] font-bold leading-none tracking-tight">{formatQty(awaiting)}</dd>
        </div>
        {(
          [
            [ShieldCheck, t.money.held, money.held_piastres],
            [Wallet, t.money.payable, money.payable_piastres],
          ] as const
        ).map(([Icon, label, value]) => (
          <div key={label} className="rounded-[22px] bg-card p-5 sm:p-6">
            <dt className="flex items-center gap-2 text-[15px] text-muted-foreground">
              <Icon className="size-[18px]" aria-hidden="true" />
              {label}
            </dt>
            <dd className="mt-3 font-heading text-[40px] font-bold leading-none tracking-tight">
              <Money piastres={value} locale={locale} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-muted-foreground">
        <span>
          {t.money.paidOut}: <Money piastres={money.paid_out_piastres} locale={locale} className="font-medium text-foreground" />
        </span>
        <span>{t.money.commissionRate(String(money.commission_bps / 100))}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-card p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium" data-testid="listing-count">
            {d.used(list.length)}
          </p>
          <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`h-2.5 flex-1 rounded-full ${i < list.length ? "bg-primary" : "bg-input/45"}`} />
            ))}
          </div>
        </div>
        {full ? null : (
          <Button asChild>
            <Link href={`/${locale}/seller/products/new`}>
              <Plus aria-hidden="true" />
              {d.add}
            </Link>
          </Button>
        )}
      </div>
      {full ? <p className="notice mt-3">{d.limitReached}</p> : null}

      <section className="mt-12">
        <h2 className="font-heading text-[24px] font-bold tracking-tight sm:text-[30px] rtl:leading-[1.4]">{d.recent}</h2>
        <div className="mt-5">
          <OrdersTable orders={orders} t={t} locale={locale} party="buyer" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-heading text-[24px] font-bold tracking-tight sm:text-[30px] rtl:leading-[1.4]">{d.products}</h2>
        {list.length === 0 ? (
          <p className="card mt-5 text-muted-foreground">{d.none}</p>
        ) : (
          <ul className="mt-5 space-y-2.5">
            {list.map((p) => (
              <li key={p.ref} className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[22px] bg-card p-4 sm:px-5">
                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                  <Link href={`/${locale}/seller/products/${p.ref}`} className="font-medium leading-snug underline-offset-4 hover:underline">
                    {pick(p, "title", locale)}
                  </Link>
                  <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    <span className="num">{p.part_number}</span>
                    <span>
                      {t.product.stock} <span className="num">{formatQty(p.stock)}</span>
                    </span>
                    <span>
                      {t.product.moq} <span className="num">{formatQty(p.min_order_qty)}</span>
                    </span>
                  </p>
                </div>
                <Money piastres={p.price_piastres} locale={locale} className="text-[17px] font-semibold" />
                <span className={`pill ms-auto sm:ms-0 ${p.status === "active" ? "pill-ok" : p.status === "paused" ? "pill-muted" : "pill-held"}`}>
                  {p.status === "active" ? t.productForm.statusActive : p.status === "paused" ? t.productForm.statusPaused : t.productForm.statusFlagged}
                </span>
                <Link href={`/${locale}/seller/products/${p.ref}`} className="btn btn-ghost btn-sm w-full sm:w-auto">
                  {d.edit}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="card mt-12">
        <summary className="cursor-pointer font-heading text-[20px] font-bold">
          {d.identityTitle} <span className="text-[15px] font-normal text-primary">({d.view})</span>
        </summary>
        <p className="mt-2 text-[15px] text-muted-foreground">{d.identityLead}</p>
        <p className="mt-1 text-[15px] text-muted-foreground">{d.codeHint}</p>
        {me ? (
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[15px] sm:grid-cols-[auto_1fr]" data-testid="own-identity">
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
                <dt className="text-muted-foreground">{k}</dt>
                <dd dir="ltr" className="mb-2 text-start sm:mb-0">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </details>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: t.titles.seller };
}
