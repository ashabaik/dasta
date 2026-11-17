import { asLocale, getDict, pick } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { RevealForm } from "@/components/reveal-form";
import { AdminNav } from "@/components/orders";
import { adminSetSellerStatus } from "../actions";

type Search = Record<string, string | string[] | undefined>;
type SellerRow = { id: string; code: string; region: string; status: string; verified: boolean; products: { count: number }[] };

export default async function AdminPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const a = t.admin;
  await requireRole(locale, "admin");
  const errorKey = String((await searchParams).error ?? "");
  const supabase = await supabaseServer();

  // The admin reads the same public sellers table as everyone (all statuses, by policy).
  // Names, phones and addresses are not in it: they only come out of the audited reveal function.
  const [{ data: sellers }, { data: regions }, { data: reveals }] = await Promise.all([
    supabase.from("sellers").select("id, code, region, status, verified, products(count)").order("code"),
    supabase.from("regions").select("key, name_en, name_ar"),
    supabase.rpc("admin_list_reveals"),
  ]);
  const regionNames = Object.fromEntries((regions ?? []).map((r) => [r.key, pick(r, "name", locale)]));
  const list = (sellers ?? []) as unknown as SellerRow[];
  const o = t.onboarding;

  const Action = ({ seller, status, verified, label, kind = "" }: { seller: SellerRow; status: string; verified?: boolean; label: string; kind?: string }) => (
    <form action={adminSetSellerStatus}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="seller_id" value={seller.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="verified" value={verified === undefined ? "" : String(verified)} />
      <button type="submit" className={`btn btn-ghost btn-sm ${kind}`}>
        {label}
      </button>
    </form>
  );

  return (
    <>
      <h1 className="page-title">{a.title}</h1>
      <AdminNav locale={locale} t={t} current="sellers" />
      {errorKey ? <p className="error mt-4">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}

      <h2 className="h-section">{a.sellers}</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>{a.code}</th>
              <th>{a.region}</th>
              <th>{a.status}</th>
              <th>{a.verified}</th>
              <th>{a.listings}</th>
              <th>{a.actions}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td className="code whitespace-nowrap font-medium">{s.code}</td>
                <td className="whitespace-nowrap">{regionNames[s.region]}</td>
                <td>
                  <span className={`pill ${s.status === "active" ? "pill-ok" : s.status === "pending" ? "pill-held" : "pill-danger"}`}>{t.sellerDash.status[s.status]}</span>
                </td>
                <td>{s.verified ? <span className="font-medium text-ok">✓ {a.yes}</span> : a.no}</td>
                <td className="code">{s.products?.[0]?.count ?? 0}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {s.status === "pending" ? <Action seller={s} status="active" verified={true} label={a.approve} /> : null}
                    {s.status === "active" ? <Action seller={s} status="suspended" label={a.suspend} kind="btn-danger" /> : null}
                    {s.status === "suspended" ? <Action seller={s} status="active" label={a.reactivate} /> : null}
                    {s.status === "active" ? <Action seller={s} status="active" verified={!s.verified} label={s.verified ? a.unverify : a.verify} /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="h-section">{a.revealTitle}</h2>
      <div className="card space-y-3">
        <p className="text-[13px] text-muted">{a.revealLead}</p>
        <RevealForm
          locale={locale}
          sellers={list.map((s) => ({ id: s.id, code: s.code }))}
          labels={{
            seller: a.seller,
            reason: a.reason,
            reasonPlaceholder: a.reasonPlaceholder,
            reveal: a.reveal,
            revealed: a.revealed,
            errors: t.errors,
            fields: {
              legal_name: o.legalName,
              contact_name: o.contactName,
              phone: o.phone,
              email: o.email,
              address: o.address,
              tax_id: o.taxId,
              bank_name: o.bankName,
              iban: o.iban,
            },
          }}
        />
      </div>

      <h2 className="h-section">{a.auditTitle}</h2>
      {!reveals || reveals.length === 0 ? (
        <p className="card text-muted">{a.auditEmpty}</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table" data-testid="audit-log">
            <thead>
              <tr>
                <th>{a.when}</th>
                <th>{a.seller}</th>
                <th>{a.reason}</th>
              </tr>
            </thead>
            <tbody>
              {reveals.map((r: { id: number; created_at: string; seller_code: string; reason: string }) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{formatDateTime(r.created_at, locale)}</td>
                  <td className="code whitespace-nowrap">{r.seller_code}</td>
                  <td>{r.reason}</td>
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
  return { title: t.titles.admin };
}
