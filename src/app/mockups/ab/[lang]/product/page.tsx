import Image from "next/image";
import { ViewTransition } from "react";
import { BadgeCheck, Clock, MessageSquare, Minus, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { asLang, byId, dastaCategories, dastaProducts, dict, money, name, unit } from "@/mockups/data";
import { Card, Footer, Header } from "@/mockups/ab";

// A working screen: light and fast. No smooth-scroll layer, nothing held; the only movement is the
// photograph arriving from the list and the answers to what the visitor does.
export default async function ProductAB({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const p = byId("mugs");
  const cat = dastaCategories.find((c) => c.key === p.cat)!;
  const more = dastaProducts.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  // A product's gallery holds only its own photographs. This one has one, so one is shown.
  const photos = [p.img];

  return (
    <>
      <Header lang={lang} t={t} path="/product" />
      <ViewTransition>
        <main className="mx-auto max-w-[1240px] px-4 pb-28 sm:px-8 lg:pb-0">
          <div className="grid grid-cols-1 gap-7 pt-2 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pt-8">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <ViewTransition name="photo-mugs" share="morph" default="none">
                <Image src={photos[0]} alt={name(p, lang)} width={1100} height={1100} preload sizes="(min-width: 1024px) 572px, 100vw" className="aspect-[4/5] w-full rounded-[24px] bg-muted object-cover" />
              </ViewTransition>
              {photos.length > 1 ? (
                <ul className="mt-3 grid grid-cols-4 gap-3">
                  {photos.map((src, i) => (
                    <li key={src}>
                      <Image src={src} alt="" width={300} height={300} className={`aspect-square w-full rounded-2xl bg-muted object-cover ${i === 0 ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <p className="inline-flex rounded-full bg-card px-3 py-1 text-[13px] font-medium text-muted-foreground">{name(cat, lang)}</p>
                <h1 className="mt-3 font-heading text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[46px] rtl:leading-[1.4]" style={{ textWrap: "balance" }}>
                  {name(p, lang)}
                </h1>
                <p className="mt-3 inline-flex items-center gap-1.5 text-[15px] text-muted-foreground">
                  <Clock className="size-[18px]" aria-hidden="true" />
                  {t.lead} <span className="num text-foreground">{p.lead}</span> {t.days}
                </p>
              </div>

              {/* Price breaks as three choices; the first is the selected one. */}
              <fieldset>
                <legend className="mb-2.5 text-[15px] font-semibold">{t.priceBreaks}</legend>
                <div className="grid grid-cols-3 gap-2.5">
                  {p.breaks.map(([q, price], i) => (
                    <label key={q} className={`cursor-pointer rounded-2xl p-3.5 text-center transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${i === 0 ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}>
                      <input type="radio" name="ab-break" defaultChecked={i === 0} className="sr-only" />
                      <span className={`block text-[13px] ${i === 0 ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
                        <span className="num">{money(q)}</span>+
                      </span>
                      <span className="mt-0.5 block text-[20px] font-semibold">
                        <span className="num">{money(price)}</span> <span className="text-[13px] font-normal">{t.egp}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="rounded-[22px] bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="ab-qty" className="text-[15px] font-medium">
                    {t.quantity} <span className="text-muted-foreground">({unit(p, lang)})</span>
                  </label>
                  <div className="flex h-12 items-center rounded-full border border-input bg-background">
                    <button type="button" className="grid size-12 place-items-center rounded-full transition-colors duration-200 hover:bg-muted active:bg-accent" aria-label={t.decrease}>
                      <Minus className="size-4" />
                    </button>
                    <input id="ab-qty" defaultValue={p.moq} inputMode="numeric" className="num h-full w-14 bg-transparent text-center text-base font-medium outline-none" />
                    <button type="button" className="grid size-12 place-items-center rounded-full transition-colors duration-200 hover:bg-muted active:bg-accent" aria-label={t.increase}>
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 hidden gap-2.5 lg:flex">
                  <Button className="h-12 flex-1 rounded-full text-base">
                    {t.addToOrder} <span className="num">{money(p.price * p.moq)}</span> {t.egp}
                  </Button>
                  <Button variant="outline" className="h-12 rounded-full border-input bg-background px-5 text-base">
                    <MessageSquare className="size-[18px]" aria-hidden="true" />
                    {t.message}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3.5 rounded-[22px] bg-accent p-4 text-[15px] sm:p-5">
                <ShieldCheck className="mt-0.5 size-[22px] shrink-0 text-primary" aria-hidden="true" />
                <p>
                  <span className="font-semibold">{t.orderProtection}.</span> {t.protectedPayText}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-card text-[15px] font-semibold">SP</span>
                  <div>
                    <p className="font-semibold">
                      {t.supplierCode} <span className="num">{p.supplier}</span>
                    </p>
                    <p className="inline-flex items-center gap-1 text-sm text-primary">
                      <BadgeCheck className="size-4" aria-hidden="true" />
                      {t.verified}
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="h-11 rounded-full border-input px-4 text-[15px] lg:hidden">
                  <MessageSquare className="size-[18px]" aria-hidden="true" />
                  {t.message}
                </Button>
              </div>

              <div>
                <h2 className="text-[15px] font-semibold">{t.details}</h2>
                <p className="mt-1.5 max-w-[60ch] text-muted-foreground">{t.detailsText}</p>
              </div>
            </div>
          </div>

          <section className="mt-20 sm:mt-28">
            <h2 className="font-heading text-[26px] font-bold tracking-tight sm:text-[34px] rtl:leading-[1.4]">
              {t.moreIn} {name(cat, lang)}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
              {more.map((x) => (
                <Card key={x.id} p={x} lang={lang} t={t} />
              ))}
            </div>
          </section>
        </main>
      </ViewTransition>
      <div className="hidden lg:block">
        <Footer lang={lang} t={t} path="/product" />
      </div>

      {/* Phone: the action stays on screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <Button className="h-13 w-full rounded-full text-base">
          {t.addToOrder} <span className="num">{money(p.price * p.moq)}</span> {t.egp}
        </Button>
      </div>
    </>
  );
}
