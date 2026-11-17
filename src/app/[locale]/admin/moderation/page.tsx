import Link from "next/link";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { AdminNav } from "@/components/orders";
import { approveListing, clearStrikes, moderate } from "../../chat-actions";

type Search = Record<string, string | string[] | undefined>;
type QueueRow = {
  message_id: number;
  created_at: string;
  thread_id: string;
  sender: string;
  sender_code: string;
  other_code: string;
  product_ref: string;
  severity: string;
  reasons: string[];
  body: string;
};

export default async function AdminModerationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const m = t.moderation;
  await requireRole(locale, "admin");
  const errorKey = String((await searchParams).error ?? "");
  const supabase = await supabaseServer();
  const [{ data: queue }, { data: strikes }, { data: flagged }] = await Promise.all([
    supabase.rpc("admin_moderation_queue"),
    supabase.rpc("admin_chat_strikes"),
    supabase.from("products").select("ref, title_en, title_ar, part_number, description_en, description_ar, specs, sellers!inner(code)").eq("status", "flagged").order("ref"),
  ]);
  const rows = (queue ?? []) as QueueRow[];

  return (
    <>
      <h1 className="page-title">{t.admin.title}</h1>
      <AdminNav locale={locale} t={t} current="moderation" />
      {errorKey ? <p className="error mt-4">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}

      <h2 className="h-section">{m.queue}</h2>
      {rows.length === 0 ? (
        <p className="card text-muted-foreground">{m.queueEmpty}</p>
      ) : (
        <ul className="space-y-3" data-testid="moderation-queue">
          {rows.map((r) => (
            <li key={r.message_id} className="card space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                <span className={`pill ${r.severity === "block" ? "pill-danger" : "pill-held"}`}>{m.severity[r.severity]}</span>
                <span>
                  {m.from} <span className="code font-medium text-foreground">{r.sender_code}</span> {m.to} <span className="code font-medium text-foreground">{r.other_code}</span>
                </span>
                <Link href={`/${locale}/messages/${r.thread_id}`} className="code text-primary">
                  {r.product_ref}
                </Link>
                <span>{formatDateTime(r.created_at, locale)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.reasons.map((x) => (
                  <span key={x} className="tag">
                    {m.reasons[x] ?? x}
                  </span>
                ))}
              </div>
              <div className="rounded border border-held-bg bg-held-bg p-2.5">
                <h3 className="text-[12px] font-semibold text-held">{m.text}</h3>
                <p dir="auto" className="mt-0.5 whitespace-pre-line break-words text-sm">
                  {r.body}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["release", "confirm"] as const).map((decision) => (
                  <form key={decision} action={moderate}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="message_id" value={r.message_id} />
                    <input type="hidden" name="decision" value={decision} />
                    <button type="submit" className={`btn btn-sm ${decision === "release" ? "btn-ghost" : "btn-danger"}`} data-testid={`mod-${decision}`}>
                      {decision === "release" ? m.release : m.confirm}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="h-section">{m.strikes}</h2>
      {!strikes || strikes.length === 0 ? (
        <p className="card text-muted-foreground">{m.strikesEmpty}</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table" data-testid="strikes-table">
            <thead>
              <tr>
                <th>{t.admin.code}</th>
                <th>{m.strikes}</th>
                <th>{t.admin.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {strikes.map((s: { code: string; strikes: number; suspended: boolean }) => (
                <tr key={s.code}>
                  <td className="code font-medium">{s.code}</td>
                  <td className="code">{s.strikes} / 3</td>
                  <td>{s.suspended ? <span className="pill pill-danger">{m.suspended}</span> : null}</td>
                  <td className="text-end">
                    <form action={clearStrikes}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="code" value={s.code} />
                      <button type="submit" className="btn btn-ghost btn-sm">
                        {m.clear}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="h-section">{m.listings}</h2>
      {!flagged || flagged.length === 0 ? (
        <p className="card text-muted-foreground">{m.listingsEmpty}</p>
      ) : (
        <ul className="space-y-3" data-testid="flagged-listings">
          {flagged.map((p) => (
            <li key={p.ref} className="card space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                <span className="pill pill-held">{t.productForm.statusFlagged}</span>
                <span className="code font-medium text-foreground">{(p.sellers as unknown as { code: string }).code}</span>
                <span className="code">{p.part_number}</span>
              </div>
              <p className="font-medium">{pick(p, "title", locale)}</p>
              <p dir="auto" className="whitespace-pre-line break-words rounded border border-held-bg bg-held-bg p-2.5 text-sm">
                {[p.title_en, p.title_ar, p.description_en, p.description_ar, ...(p.specs as { k_en: string; v: string }[]).map((x) => `${x.k_en} = ${x.v}`)].filter(Boolean).join("\n")}
              </p>
              <form action={approveListing}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="ref" value={p.ref} />
                <button type="submit" className="btn btn-ghost btn-sm">
                  {m.approve}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: `${t.titles.admin} · ${t.adminNav.moderation}` };
}
