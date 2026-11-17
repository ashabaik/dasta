import { BadgeCheck, Check, MessageSquare, Minus, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import { asLang, byId, categories, dict, money, name, products, unit } from "@/mockups/data";
import { Footer, Header, Row } from "@/mockups/c";

export default async function ProductC({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const ar = lang === "ar";
  const p = byId("mugs");
  const cat = categories.find((c) => c.key === p.cat)!;
  const more = products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);

  return (
    <>
      <Header lang={lang} t={t} path="/product" />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="grid gap-x-14 gap-y-6 pt-5 lg:grid-cols-[1fr_1fr] lg:pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.img} alt={name(p, lang)} className="aspect-square w-full bg-muted object-cover lg:sticky lg:top-6 lg:self-start" />

          <div className="min-w-0">
            <p className="text-[15px] text-muted-foreground">
              {name(cat, lang)} · <span className="num">{p.supplier}</span>
            </p>
            <h1 className={`mt-2 font-heading font-black ${ar ? "text-[34px] leading-[1.4] sm:text-[52px]" : "text-[40px] uppercase leading-[0.98] sm:text-[68px]"}`} style={{ textWrap: "balance" }}>
              {name(p, lang)}
            </h1>
            <p className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="cond num font-heading text-[64px] font-black leading-[0.85]">{money(p.price)}</span>
              <span className="text-[17px] text-muted-foreground">
                {t.egp} / {unit(p, lang)}
              </span>
            </p>
            <p className="mt-3 text-[15px] text-muted-foreground">
              {t.moq} <span className="num text-foreground">{money(p.moq)}</span> · {t.lead} <span className="num text-foreground">{p.lead}</span> {t.days}
            </p>

            <h2 className="mt-9 border-b-2 border-foreground pb-2 font-heading text-[24px] font-black ltr:uppercase">{t.priceBreaks}</h2>
            <Table className="text-[16px]">
              <TableHeader>
                <TableRow className="border-input hover:bg-transparent">
                  <TableHead className="h-11 px-2 text-start text-sm font-medium text-muted-foreground">{t.quantity}</TableHead>
                  <TableHead className="h-11 px-2 text-end text-sm font-medium text-muted-foreground">{t.unitPrice}</TableHead>
                  <TableHead className="h-11 px-2 text-end text-sm font-medium text-muted-foreground">{t.saving}</TableHead>
                  <TableHead className="h-11 w-10 px-2">
                    <span className="sr-only">{t.selected}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.breaks.map(([q, price], i) => (
                  <TableRow key={q} className={`border-input ${i === 0 ? "bg-accent font-semibold hover:bg-accent" : "hover:bg-muted"}`}>
                    <TableCell className="px-2 py-3.5">
                      <span className="num">{money(q)}</span>+
                    </TableCell>
                    <TableCell className="px-2 py-3.5 text-end">
                      <span className="num">{money(price)}</span> {t.egp}
                    </TableCell>
                    <TableCell className="px-2 py-3.5 text-end">
                      <span className="num">{i === 0 ? "0" : Math.round((1 - price / p.price) * 100)}%</span>
                    </TableCell>
                    <TableCell className="px-2 py-3.5">{i === 0 ? <Check className="size-5" aria-label={t.selected} /> : null}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-7 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="c-qty" className="mb-1.5 block text-[15px] font-medium">
                  {t.quantity} <span className="font-normal text-muted-foreground">({unit(p, lang)})</span>
                </label>
                <div className="flex h-13 items-center border border-foreground">
                  <button type="button" className="grid h-full w-12 place-items-center hover:bg-muted" aria-label={t.decrease}>
                    <Minus className="size-4" />
                  </button>
                  <input id="c-qty" defaultValue={p.moq} inputMode="numeric" className="num h-full w-16 bg-transparent text-center text-[17px] font-semibold outline-none focus-visible:bg-accent" />
                  <button type="button" className="grid h-full w-12 place-items-center hover:bg-muted" aria-label={t.increase}>
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <Button className="h-13 min-w-[200px] flex-1 rounded-none text-[17px]">
                {t.addToOrder} · <span className="num">{money(p.price * p.moq)}</span> {t.egp}
              </Button>
            </div>
            <Button variant="outline" className="mt-3 h-12 w-full rounded-none border-foreground text-[16px]">
              <MessageSquare className="size-[18px]" aria-hidden="true" />
              {t.message}
            </Button>

            <ul className="mt-8 border-t-2 border-foreground text-[16px]">
              <li className="flex gap-3 border-b border-input py-4">
                <ShieldCheck className="mt-0.5 size-[22px] shrink-0" aria-hidden="true" />
                <p>
                  <span className="font-semibold">{t.orderProtection}.</span> {t.protectedPayText}
                </p>
              </li>
              <li className="flex gap-3 border-b border-input py-4">
                <BadgeCheck className="mt-0.5 size-[22px] shrink-0" aria-hidden="true" />
                <p>
                  <span className="font-semibold">{t.verified}.</span> {t.verifiedText}
                </p>
              </li>
            </ul>

            <h2 className="mt-8 font-heading text-[24px] font-black ltr:uppercase">{t.details}</h2>
            <p className="mt-1.5 max-w-[60ch] text-muted-foreground">{t.detailsText}</p>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="border-b-2 border-foreground pb-3 font-heading text-[32px] font-black leading-none ltr:uppercase sm:text-[46px] rtl:leading-[1.3]">{t.more}</h2>
          <div className="grid gap-x-12 md:grid-cols-2">
            {more.map((x) => (
              <Row key={x.id} p={x} lang={lang} t={t} />
            ))}
          </div>
        </section>
      </main>
      <Footer lang={lang} t={t} />
    </>
  );
}
