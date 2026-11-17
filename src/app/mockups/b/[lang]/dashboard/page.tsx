import Link from "next/link";
import { ClipboardList, LayoutGrid, MessageSquare, Plus, ShieldCheck, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { asLang, byId, dict, money, name, orders } from "@/mockups/data";
import { BASE, Footer, Header, TabBar } from "@/mockups/b";

const TONE: Record<string, string> = {
  awaiting: "bg-[#fff1d0] text-[#7a4b00]",
  shipped: "bg-accent text-accent-foreground",
  completed: "bg-[#dcf3e6] text-[#125c3b]",
  refunded: "bg-muted text-muted-foreground",
};

export default async function DashboardB({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const tiles = [
    { Icon: Truck, label: t.awaiting, value: "1", suffix: "" },
    { Icon: ShieldCheck, label: t.protectedBal, value: money(18728), suffix: t.egp },
    { Icon: Wallet, label: t.ready, value: money(21114), suffix: t.egp },
  ];
  const side = [
    { Icon: ClipboardList, label: t.orders, active: true },
    { Icon: LayoutGrid, label: t.listings, active: false },
    { Icon: MessageSquare, label: t.inbox, active: false },
    { Icon: Wallet, label: t.ready, active: false },
  ];

  return (
    <>
      <Header lang={lang} t={t} path="/dashboard" />
      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 pt-2 sm:px-6 lg:grid-cols-[230px_1fr] lg:pt-6">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 rounded-[22px] bg-card p-2.5" aria-label={t.dashboard}>
            <ul className="space-y-1">
              {side.map(({ Icon, label, active }) => (
                <li key={label}>
                  <Link href={`${BASE}/${lang}/dashboard`} aria-current={active ? "page" : undefined} className={`flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-medium ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div>
          <p className="text-[15px] text-muted-foreground">
            {t.dashboard} · <span className="num">SP-2041</span>
          </p>
          <h1 className="mt-1 font-heading text-[30px] font-bold tracking-tight sm:text-[38px]">{t.hello}</h1>

          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tiles.map(({ Icon, label, value, suffix }, i) => (
              <div key={label} className={`rounded-[22px] p-5 ${i === 0 ? "bg-foreground text-background" : "bg-card"}`}>
                <dt className={`flex items-center gap-2 text-[15px] ${i === 0 ? "text-background/75" : "text-muted-foreground"}`}>
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-3 font-heading text-[38px] font-bold leading-none tracking-tight">
                  <span className="num">{value}</span>
                  {suffix ? <span className={`ms-1.5 text-base font-normal ${i === 0 ? "text-background/75" : "text-muted-foreground"}`}>{suffix}</span> : null}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-card p-5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">
                {t.listings} <span className="num">7</span> {t.ofTen}
              </p>
              <div className="mt-2.5 flex gap-1.5" role="img" aria-label={`7 ${t.ofTen}`}>
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className={`h-2.5 flex-1 rounded-full ${i < 7 ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
            </div>
            <Button className="h-11 rounded-full px-5 text-[15px]">
              <Plus className="size-[18px]" aria-hidden="true" />
              {t.addListing}
            </Button>
          </div>

          <section className="mt-8">
            <h2 className="font-heading text-[22px] font-bold tracking-tight sm:text-[26px]">{t.recent}</h2>
            <ul className="mt-4 space-y-2.5">
              {orders.map((o) => {
                const item = byId(o.item);
                return (
                  <li key={o.no} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[22px] bg-card p-3.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.img} alt="" className="size-16 rounded-2xl bg-muted object-cover" />
                    <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-0">
                      <p className="font-medium leading-snug">{name(item, lang)}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="num">{o.no}</span> · <span className="num">{money(o.qty)}</span> ×
                      </p>
                    </div>
                    <p className="text-[17px] font-semibold">
                      <span className="num">{money(o.total)}</span> <span className="text-sm font-normal text-muted-foreground">{t.egp}</span>
                    </p>
                    <span className={`ms-auto rounded-full px-3 py-1 text-[13px] font-medium sm:ms-0 ${TONE[o.status]}`}>{t.st[o.status]}</span>
                    {o.status === "awaiting" ? <Button className="h-11 w-full rounded-full px-5 text-[15px] sm:w-auto">{t.ship}</Button> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
      <Footer t={t} />
      <TabBar lang={lang} t={t} active="orders" />
    </>
  );
}
