import { BadgeCheck, MessageSquare, Minus, Plus, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Separator } from "@/components/shadcn/separator";
import { asLang, byId, categories, dict, money, name, products, unit } from "@/mockups/data";
import { Card, Footer, Header } from "@/mockups/a";

export default async function ProductA({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const p = byId("mugs");
  const cat = categories.find((c) => c.key === p.cat)!;
  const more = products.filter((x) => x.supplier === p.supplier || x.cat === p.cat).filter((x) => x.id !== p.id).slice(0, 4);

  return (
    <>
      <Header lang={lang} t={t} path="/product" />
      <main className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-8 pt-6 lg:grid-cols-[6fr_5fr] lg:gap-16 lg:pt-10">
          <div className="-mx-5 sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt={name(p, lang)} className="aspect-[4/5] w-full bg-muted object-cover lg:sticky lg:top-6" />
          </div>

          <div className="flex flex-col gap-7 lg:py-4">
            <div>
              <p className="text-[15px] text-muted-foreground">{name(cat, lang)}</p>
              <h1 className="mt-2 font-heading text-[40px] leading-[1.08] sm:text-[52px] rtl:leading-[1.3]" style={{ textWrap: "balance" }}>
                {name(p, lang)}
              </h1>
            </div>

            <div>
              <p className="text-[34px] font-semibold leading-none">
                <span className="num">{money(p.price)}</span> <span className="text-lg font-normal text-muted-foreground">{t.egp} / {unit(p, lang)}</span>
              </p>
              <p className="mt-2 text-[15px] text-muted-foreground">
                {t.moq} <span className="num text-foreground">{money(p.moq)}</span> · {t.lead} <span className="num text-foreground">{p.lead}</span> {t.days}
              </p>
            </div>

            <div>
              <h2 className="text-[15px] font-semibold">{t.priceBreaks}</h2>
              <dl className="mt-2 divide-y divide-border border-y border-border text-[15px]">
                {p.breaks.map(([q, price]) => (
                  <div key={q} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground">
                      <span className="num">{money(q)}</span>+ {unit(p, lang)}
                    </dt>
                    <dd className="font-medium">
                      <span className="num">{money(price)}</span> {t.egp}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="a-qty" className="mb-1.5 block text-sm text-muted-foreground">
                  {t.quantity}
                </label>
                <div className="flex h-12 items-center border border-input">
                  <button type="button" className="grid size-12 place-items-center hover:bg-muted" aria-label={t.decrease}>
                    <Minus className="size-4" />
                  </button>
                  <input id="a-qty" defaultValue={p.moq} inputMode="numeric" className="num h-full w-16 bg-transparent text-center text-base outline-none" />
                  <button type="button" className="grid size-12 place-items-center hover:bg-muted" aria-label={t.increase}>
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <Button className="h-12 flex-1 px-6 text-base sm:flex-none">{t.addToOrder}</Button>
              <Button variant="outline" className="h-12 w-full px-5 text-base sm:w-auto">
                <MessageSquare className="size-[18px]" aria-hidden="true" />
                {t.message}
              </Button>
            </div>

            <div className="flex gap-3 bg-muted p-4 text-[15px]">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <p>
                <span className="font-semibold">{t.orderProtection}.</span> <span className="text-muted-foreground">{t.protectedPayText}</span>
              </p>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3 text-[15px]">
              <div>
                <p className="text-muted-foreground">{t.soldBy}</p>
                <p className="mt-0.5 flex items-center gap-2 font-medium">
                  <span className="num">{p.supplier}</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    <BadgeCheck className="size-[18px]" aria-hidden="true" />
                    {t.verified}
                  </span>
                </p>
              </div>
              <p className="flex items-center gap-1.5">
                <Star className="size-[18px] fill-foreground" aria-hidden="true" />
                <span className="num font-medium">{p.rating}</span> <span className="text-muted-foreground">{t.rating}</span>
              </p>
            </div>

            <div>
              <h2 className="text-[15px] font-semibold">{t.details}</h2>
              <p className="mt-2 max-w-[60ch] text-muted-foreground">{t.detailsText}</p>
            </div>
          </div>
        </div>

        <section className="mt-20">
          <h2 className="font-heading text-[32px] leading-tight sm:text-[40px]">{t.more}</h2>
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {more.map((x) => (
              <Card key={x.id} p={x} lang={lang} t={t} />
            ))}
          </div>
        </section>
      </main>
      <Footer lang={lang} t={t} />
    </>
  );
}
