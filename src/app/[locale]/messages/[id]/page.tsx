import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { ThreadLive } from "@/components/thread-live";
import { sendMessage } from "../../chat-actions";

type Search = Record<string, string | string[] | undefined>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ThreadPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Search> }) {
  const p0 = await params;
  const locale = asLocale(p0.locale);
  const t = getDict(locale);
  const c = t.chat;
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/signin`);
  if (!UUID.test(p0.id)) notFound();
  const sp = await searchParams;
  const errorKey = String(sp.error ?? "");
  const notice = String(sp.notice ?? "");
  const supabase = await supabaseServer();

  const { data: thread } = await supabase.from("threads").select("id, buyer_code, seller_code, product_ref, title_en, title_ar").eq("id", p0.id).maybeSingle();
  if (!thread) notFound();
  // The policy on messages decides which rows come back: delivered ones, plus this visitor's own
  // stopped ones (with an empty body).
  const [{ data: messages }, { data: mine }] = await Promise.all([
    supabase.from("messages").select("id, sender, body, status, created_at").eq("thread_id", thread.id).order("id"),
    viewer.role === "admin" ? Promise.resolve({ data: null }) : supabase.rpc("chat_my_status"),
  ]);
  const list = messages ?? [];
  const strikes = mine?.[0]?.strikes ?? 0;
  const suspended = mine?.[0]?.suspended ?? false;
  const otherLabel = viewer.role === "buyer" ? t.seller.label : viewer.role === "seller" ? t.orders.buyer : "";
  const otherCode = viewer.role === "buyer" ? thread.seller_code : viewer.role === "seller" ? thread.buyer_code : `${thread.buyer_code} ↔ ${thread.seller_code}`;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mt-5 text-sm">
        <Link href={`/${locale}/messages`} className="text-primary">
          <span className="arrow" aria-hidden="true">←</span> {c.title}
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {c.withParty} {otherLabel} <span className="code">{otherCode}</span>
        </h1>
        <Link href={`/${locale}/p/${thread.product_ref}`} className="text-sm text-primary">
          {c.about}: {pick(thread, "title", locale)}
        </Link>
      </div>
      <p className="notice mt-3">{c.rules}</p>
      {notice === "held" ? <p className="error mt-3">{c.noticeHeld}</p> : null}
      {notice === "blocked" ? <p className="error mt-3">{c.noticeBlocked}</p> : null}
      {errorKey ? <p className="error mt-3">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}

      <ol className="card mt-3 flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto" data-testid="messages" aria-live="polite">
        {list.length === 0 ? <li className="text-muted-foreground">{c.empty}</li> : null}
        {list.map((m) => {
          const own = m.sender === viewer.role;
          const stopped = m.status !== "delivered" && m.status !== "released";
          return (
            <li key={m.id} className={`flex flex-col ${own ? "items-end" : "items-start"}`} data-status={m.status}>
              <span className="text-xs text-muted-foreground">
                {own ? c.you : m.sender === "buyer" ? t.orders.buyer : t.seller.label} · {formatDateTime(m.created_at, locale)}
              </span>
              {stopped ? (
                <span className="mt-0.5 max-w-[85%] rounded-2xl bg-danger-bg px-3.5 py-2 text-sm text-danger">
                  {m.status === "held" ? c.heldOwn : c.blockedOwn}
                </span>
              ) : (
                <span dir="auto" className={`mt-0.5 max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-[15px] ${own ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                  {m.body}
                </span>
              )}
            </li>
          );
        })}
        <ThreadLive threadId={thread.id} scrollKey={list.length} />
      </ol>

      {viewer.role === "admin" ? (
        <p className="mt-3 text-[13px] text-muted-foreground">{c.adminReadOnly}</p>
      ) : suspended ? (
        <p className="error mt-3" data-testid="chat-suspended">
          {c.suspended}
        </p>
      ) : (
        <form action={sendMessage} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="thread_id" value={thread.id} />
          <label className="sr-only" htmlFor="m-body">
            {c.placeholder}
          </label>
          <textarea id="m-body" name="body" rows={2} maxLength={1000} required dir="auto" className="input min-w-0 flex-1" placeholder={c.placeholder} />
          <button type="submit" className="btn" data-testid="send">
            {c.send}
          </button>
        </form>
      )}
      {viewer.role !== "admin" ? (
        <p className={`mt-2 text-[13px] ${strikes > 0 ? "font-medium text-danger" : "text-muted-foreground"}`} data-testid="strikes">
          {c.strikes(strikes)}
        </p>
      ) : null}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: t.titles.messages };
}
