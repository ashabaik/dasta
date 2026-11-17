import { Plus } from "lucide-react";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Progress } from "@/components/shadcn/progress";
import { asLang, byId, dict, money, name, orders } from "@/mockups/data";
import { Footer, Header } from "@/mockups/a";

const TONE: Record<string, string> = {
  awaiting: "bg-[#fdf1d6] text-[#7a4b00]",
  shipped: "bg-[#e3eefb] text-[#174a86]",
  completed: "bg-[#e0f1e8] text-[#17543d]",
  refunded: "bg-muted text-muted-foreground",
};

export default async function DashboardA({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const figures: [string, string, string][] = [
    [t.awaiting, "1", ""],
    [t.protectedBal, money(18728), t.egp],
    [t.ready, money(21114), t.egp],
  ];

  return (
    <>
      <Header lang={lang} t={t} path="/dashboard" />
      <main className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-10">
          <div>
            <p className="text-[15px] text-muted-foreground">
              {t.dashboard} · <span className="num">SP-2041</span>
            </p>
            <h1 className="mt-1 font-heading text-[44px] leading-tight sm:text-[56px]">{t.hello}</h1>
          </div>
          <Button className="h-11 px-5 text-[15px]">
            <Plus className="size-[18px]" aria-hidden="true" />
            {t.addListing}
          </Button>
        </div>

        {/* Three figures, no boxes: the numbers carry the page. */}
        <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 border-y border-border py-8 sm:grid-cols-3">
          {figures.map(([label, value, suffix]) => (
            <div key={label}>
              <dt className="text-[15px] text-muted-foreground">{label}</dt>
              <dd className="mt-1.5 font-heading text-[52px] leading-none">
                <span className="num">{value}</span>
                {suffix ? <span className="ms-2 font-sans text-lg text-muted-foreground">{suffix}</span> : null}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 max-w-sm">
          <div className="flex items-baseline justify-between text-[15px]">
            <span className="font-medium">{t.listings}</span>
            <span className="text-muted-foreground">
              <span className="num text-foreground">7</span> {t.ofTen}
            </span>
          </div>
          <Progress value={70} className="mt-2 h-1.5" aria-label={t.listings} />
        </div>

        <section className="mt-14">
          <h2 className="font-heading text-[32px] leading-tight sm:text-[38px]">{t.recent}</h2>
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {orders.map((o) => {
              const item = byId(o.item);
              return (
                <li key={o.no} className="grid grid-cols-[56px_1fr_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[64px_1.6fr_1fr_auto_auto]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.img} alt="" className="aspect-square w-full bg-muted object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name(item, lang)}</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="num">{o.no}</span> · <span className="num">{money(o.qty)}</span> × · <span className="num">{o.buyer}</span>
                    </p>
                  </div>
                  <p className="col-start-2 text-[15px] font-medium sm:col-start-auto">
                    <span className="num">{money(o.total)}</span> <span className="font-normal text-muted-foreground">{t.egp}</span>
                  </p>
                  <Badge className={`col-start-3 row-start-1 justify-self-end rounded-full border-0 px-2.5 py-1 text-[13px] font-medium sm:col-start-auto sm:row-start-auto ${TONE[o.status]}`}>{t.st[o.status]}</Badge>
                  <div className="col-span-3 sm:col-span-1 sm:justify-self-end">
                    {o.status === "awaiting" ? (
                      <Button className="h-11 w-full px-4 text-[15px] sm:w-auto">{t.ship}</Button>
                    ) : (
                      <Button variant="ghost" className="h-11 px-3 text-[15px] text-primary">
                        {t.view}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <Footer lang={lang} t={t} />
    </>
  );
}
