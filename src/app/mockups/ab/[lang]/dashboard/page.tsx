import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { ClipboardList, LayoutGrid, MessageSquare, Plus, ShieldCheck, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { asLang, byId, dict, money, name, orders, sumOrders } from "@/mockups/data";
import { BASE, Footer, Header, TabBar } from "@/mockups/ab";

// A working screen: no smooth-scroll layer, nothing held. Motion only answers an action (150-300 ms).

// Green stays the only accent: amber is kept for the one state that needs action.
const TONE: Record<string, string> = {
  awaiting: "bg-[#fff1d0] text-[#7a4b00]",
  shipped: "bg-background text-foreground ring-1 ring-inset ring-input",
  completed: "bg-accent text-accent-foreground",
  refunded: "bg-muted text-muted-foreground",
};

export default async function DashboardAB({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  // Every figure is added up from the orders listed below it.
  const tiles = [
    { Icon: Truck, label: t.awaiting, value: String(orders.filter((o) => o.status === "awaiting").length), suffix: "" },
    { Icon: ShieldCheck, label: t.protectedBal, value: money(sumOrders("awaiting", "shipped")), suffix: t.egp },
    { Icon: Wallet, label: t.ready, value: money(sumOrders("completed")), suffix: t.egp },
  ];
  const side = [
    { Icon: ClipboardList, label: t.orders, active: true },
    { Icon: LayoutGrid, label: t.listings, active: false },
    { Icon: MessageSquare, label: t.inbox, active: false },
    { Icon: Wallet, label: t.ready, active: false },
  ];

  return (
    <>
      <Header lang={lang} t={t} path="/dashboard" account="SP-2041" />
      <ViewTransition>
        <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-4 pt-2 sm:px-8 lg:grid-cols-[230px_1fr] lg:gap-12 lg:pt-8">
          <aside className="hidden lg:block">
            <nav className="sticky top-24" aria-label={t.dashboard}>
              <ul className="space-y-1">
                {side.map(({ Icon, label, active }) => (
                  <li key={label}>
                    <Link href={`${BASE}/${lang}/dashboard`} aria-current={active ? "page" : undefined} className={`flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-medium transition-colors duration-200 ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}>
                      <Icon className="size-5" aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0">
            <p className="text-[15px] text-muted-foreground">{t.dashboard}</p>
            <h1 className="mt-1 font-heading text-[32px] font-bold tracking-tight sm:text-[44px] rtl:leading-[1.4]">{t.hello}</h1>

            <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {tiles.map(({ Icon, label, value, suffix }, i) => (
                <div key={label} className={`rounded-[22px] p-5 sm:p-6 ${i === 0 ? "bg-foreground text-background" : "bg-card"}`}>
                  <dt className={`flex items-center gap-2 text-[15px] ${i === 0 ? "text-background/80" : "text-muted-foreground"}`}>
                    <Icon className="size-[18px]" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="mt-3 font-heading text-[40px] font-bold leading-none tracking-tight">
                    <span className="num">{value}</span>
                    {suffix ? <span className={`ms-1.5 text-base font-normal ${i === 0 ? "text-background/80" : "text-muted-foreground"}`}>{suffix}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-card p-5 sm:p-6">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium">
                  {t.listings} <span className="num">7</span> {t.ofTen}
                </p>
                <div className="mt-2.5 flex gap-1.5" role="img" aria-label={`7 ${t.ofTen}`}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <span key={i} className={`h-2.5 flex-1 rounded-full ${i < 7 ? "bg-primary" : "bg-input/45"}`} />
                  ))}
                </div>
              </div>
              <Button className="h-11 rounded-full px-5 text-[15px]">
                <Plus className="size-[18px]" aria-hidden="true" />
                {t.addListing}
              </Button>
            </div>

            <section className="mt-12">
              <h2 className="font-heading text-[24px] font-bold tracking-tight sm:text-[30px] rtl:leading-[1.4]">{t.recent}</h2>
              <ul className="mt-5 space-y-2.5">
                {orders.map((o) => {
                  const item = byId(o.item);
                  return (
                    <li key={o.no} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[22px] bg-card p-3.5 sm:p-4">
                      <Image src={item.img} alt="" width={128} height={128} className="size-16 rounded-2xl bg-muted object-cover" />
                      <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-0">
                        <p className="font-medium leading-snug">{name(item, lang)}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="num">{o.no}</span> <span className="ms-2 num">{money(o.qty)} ×</span>
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
      </ViewTransition>
      <Footer lang={lang} t={t} path="/dashboard" />
      <TabBar lang={lang} t={t} active="orders" />
    </>
  );
}
