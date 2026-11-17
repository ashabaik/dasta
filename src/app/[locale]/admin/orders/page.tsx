import { asLocale, getDict } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { AdminNav, ORDER_SELECT, OrdersTable, type OrderRow } from "@/components/orders";

export default async function AdminOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  await requireRole(locale, "admin");
  const supabase = await supabaseServer();
  const { data } = await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(100);
  const orders = (data ?? []) as unknown as OrderRow[];
  const disputed = orders.filter((o) => o.status === "disputed");

  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold">{t.admin.title}</h1>
      <AdminNav locale={locale} t={t} current="orders" />
      <h2 className="h-section">{t.adminNav.disputes}</h2>
      {disputed.length ? <OrdersTable orders={disputed} t={t} locale={locale} party="both" /> : <p className="card text-muted">{t.adminNav.noDisputes}</p>}
      <h2 className="h-section">{t.adminNav.allOrders}</h2>
      <OrdersTable orders={orders} t={t} locale={locale} party="both" />
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: `${t.titles.admin} · ${t.adminNav.orders}` };
}
