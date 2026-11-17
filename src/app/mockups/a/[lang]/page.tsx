import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { asLang, categories, countIn, dict, name, products } from "@/mockups/data";
import { BASE, Card, Footer, Header, More, Promise as Promises } from "@/mockups/a";

export default async function HomeA({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const steps = t.steps;

  return (
    <>
      <Header lang={lang} t={t} />
      <main>
        {/* Opening: one photograph, one sentence. The photo runs to the edge of the window. */}
        <section className="mx-auto grid max-w-[1240px] grid-cols-1 lg:grid-cols-[5fr_6fr]">
          <div className="order-2 flex flex-col justify-center gap-6 px-5 py-10 sm:px-8 lg:order-1 lg:py-20 lg:pe-14">
            <h1 className="font-heading text-[44px] leading-[1.05] sm:text-[60px] lg:text-[68px] rtl:leading-[1.25]" style={{ textWrap: "balance" }}>
              {t.heroA}
            </h1>
            <p className="max-w-[46ch] text-lg text-muted-foreground">{t.heroASub}</p>
            <form id="search" className="flex max-w-md items-center gap-2" role="search">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="a-search" type="search" placeholder={t.search} aria-label={t.search} className="h-12 ps-11 text-base" />
              </div>
              <Button type="submit" className="h-12 px-6 text-base">
                {t.explore.split(" ")[0]}
              </Button>
            </form>
            <Promises t={t} />
          </div>
          <div className="order-1 lg:order-2 lg:-me-[max(0px,calc((100vw-1240px)/2))]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mk/lamp.jpg" alt="" className="aspect-[4/3] h-full w-full object-cover lg:aspect-auto lg:max-h-[640px]" />
          </div>
        </section>

        {/* Categories as plain links with their real counts. */}
        <nav aria-label={t.categories} className="border-y border-border">
          <ul className="mx-auto flex max-w-[1240px] gap-x-8 gap-y-2 overflow-x-auto px-5 py-1.5 text-[15px] sm:px-8 lg:flex-wrap">
            {categories.map((c) => (
              <li key={c.key} className="shrink-0">
                <Link href={`${BASE}/${lang}#products`} className="inline-flex min-h-11 items-center gap-1.5 hover:text-primary">
                  {name(c, lang)} <span className="num text-muted-foreground">{countIn(c.key)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section id="products" className="mx-auto max-w-[1240px] scroll-mt-6 px-5 pt-14 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-heading text-[34px] leading-tight sm:text-[42px]">{t.newIn}</h2>
            <More href={`${BASE}/${lang}#products`} label={t.all} />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 12).map((p) => (
              <Card key={p.id} p={p} lang={lang} t={t} />
            ))}
          </div>
        </section>

        {/* A real sequence, so it is numbered. */}
        <section className="mx-auto mt-24 max-w-[1240px] px-5 sm:px-8">
          <h2 className="font-heading text-[34px] leading-tight sm:text-[42px]">{t.howTitle}</h2>
          <ol className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3">
            {steps.map(([title, text], i) => (
              <li key={title} className="border-t border-foreground pt-5">
                <span className="num font-heading text-[40px] leading-none text-primary">{i + 1}</span>
                <h3 className="mt-3 text-xl font-medium">{title}</h3>
                <p className="mt-2 max-w-[38ch] text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer lang={lang} t={t} />
    </>
  );
}
