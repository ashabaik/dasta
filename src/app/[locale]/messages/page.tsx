import Link from "next/link";
import { redirect } from "next/navigation";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

type Search = Record<string, string | string[] | undefined>;

export default async function ThreadsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const c = t.chat;
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/signin`);
  const errorKey = String((await searchParams).error ?? "");
  const supabase = await supabaseServer();
  // Row level security returns only the conversations this visitor takes part in (all, for the admin).
  const { data: threads } = await supabase
    .from("threads")
    .select("id, buyer_code, seller_code, product_ref, title_en, title_ar, last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(100);

  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold">{c.title}</h1>
      <p className="notice mt-4">{c.rules}</p>
      {errorKey ? <p className="error mt-4">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}
      {!threads || threads.length === 0 ? (
        <p className="card mt-4 text-muted">{c.none}</p>
      ) : (
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="table" data-testid="threads">
            <thead>
              <tr>
                <th>{c.about}</th>
                {viewer.role !== "seller" ? <th>{t.seller.label}</th> : null}
                {viewer.role !== "buyer" ? <th>{t.orders.buyer}</th> : null}
                <th>{c.lastActivity}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {threads.map((th) => (
                <tr key={th.id}>
                  <td className="min-w-48">{pick(th, "title", locale)}</td>
                  {viewer.role !== "seller" ? <td className="code whitespace-nowrap">{th.seller_code}</td> : null}
                  {viewer.role !== "buyer" ? <td className="code whitespace-nowrap">{th.buyer_code}</td> : null}
                  <td className="whitespace-nowrap text-[13px] text-muted">{formatDateTime(th.last_message_at, locale)}</td>
                  <td className="text-end">
                    <Link href={`/${locale}/messages/${th.id}`} className="btn btn-ghost btn-sm">
                      {c.open}
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
  return { title: t.titles.messages };
}
