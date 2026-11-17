import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowRight, Briefcase, CookingPot, LayoutGrid, Package, Shirt, Sparkles } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { byId, categoryCover, dastaCategories, dastaCount, dastaProducts, dict, name, type Lang } from "@/mockups/data";
import { BASE, Card, Footer, Header, TabBar } from "@/mockups/ab";
import { HomeMotion } from "@/mockups/home-motion";

const CAT_ICON: Record<string, typeof Package> = { home: CookingPot, office: Briefcase, packaging: Package, textiles: Shirt, care: Sparkles };
// Aligns a full-bleed block's text with the 1240px page container.
const EDGE = "lg:ps-[max(2rem,calc((100vw-1240px)/2+2rem))]";

export function HomeAB({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const ar = lang === "ar";
  const covers = Object.values(categoryCover);
  // The category scene already shows one photograph per category; the grid shows the others.
  const fresh = dastaProducts.filter((p) => !covers.includes(p.id)).slice(0, 8);

  return (
    <>
      <Header lang={lang} t={t} />
      <ViewTransition>
        <main className="curtain">
          {/* Opening shot: the photograph fills its half of the first screen and runs off the window edge. */}
          <section data-hero className="flex flex-col lg:grid lg:min-h-[calc(100svh-72px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
            <div className={`flex flex-col justify-end px-4 pb-2 pt-6 sm:px-8 lg:pb-16 lg:pe-12 lg:pt-10 ${EDGE}`}>
              <h1 data-hero-text className={`font-heading font-bold tracking-tight ${ar ? "text-[clamp(40px,5.7vw,90px)] leading-[1.24]" : "text-[clamp(44px,6.5vw,104px)] leading-[0.98]"}`}>
                {t.heroB}
              </h1>
              <p data-hero-fade className="mt-5 max-w-[38ch] text-[18px] text-muted-foreground sm:text-[20px]">
                {t.heroBSub}
              </p>
              <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button asChild className="h-13 rounded-full px-7 text-[17px]">
                  <Link href={`${BASE}/${lang}#products`}>{t.explore}</Link>
                </Button>
                <Link href={`${BASE}/${lang}/signin`} className="inline-flex min-h-11 items-center text-[17px] font-medium text-primary underline underline-offset-4">
                  {t.sellOn}
                </Link>
              </div>
            </div>
            {/* On a phone the photograph comes first and is cropped to the lamp; the headline follows it. */}
            <div data-hero-media className="relative order-first mx-4 mt-1 aspect-[5/4] overflow-hidden rounded-[24px] bg-[#d3cfc5] sm:mx-8 sm:aspect-[16/9] lg:order-none lg:mx-0 lg:mt-0 lg:aspect-auto lg:rounded-none lg:rounded-es-[44px]">
              <div data-hero-parallax className="absolute inset-x-0 -top-[5%] h-[110%]">
                <Image data-hero-img src="/mk/lamp.jpg" alt="" fill preload sizes="(min-width: 1024px) 52vw, 100vw" className="object-cover object-[50%_82%] lg:object-[34%_50%]" />
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
            {/* Categories: one tap each, scrolls sideways on a phone. */}
            <nav aria-label={t.categories} className="-mx-4 mt-10 sm:mx-0 lg:mt-20">
              <ul className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
                <li className="shrink-0">
                  <Link href={`${BASE}/${lang}#products`} aria-current="true" className="flex h-12 items-center gap-2 rounded-full bg-foreground px-4 text-[15px] font-medium text-background">
                    <LayoutGrid className="size-[18px]" aria-hidden="true" />
                    {t.all}
                    <span className="num text-[13px] text-background/75">{dastaProducts.length}</span>
                  </Link>
                </li>
                {dastaCategories.map((c) => {
                  const Icon = CAT_ICON[c.key];
                  return (
                    <li key={c.key} className="shrink-0">
                      <Link href={`${BASE}/${lang}#products`} className="flex h-12 items-center gap-2 rounded-full bg-card px-4 text-[15px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                        <Icon className="size-[18px]" aria-hidden="true" />
                        {name(c, lang)}
                        <span className="num text-[13px] text-muted-foreground">{dastaCount(c.key)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <section id="products" className="scroll-mt-28 pt-10 sm:pt-14">
              <div className="flex items-end justify-between gap-3">
                <h2 className="font-heading text-[30px] font-bold tracking-tight sm:text-[44px] rtl:leading-[1.4]">{t.newIn}</h2>
                <Link href={`${BASE}/${lang}#products`} className="inline-flex min-h-11 items-center text-[15px] font-medium text-primary underline underline-offset-4">
                  {t.all}
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:mt-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
                {fresh.map((p, i) => (
                  <Card key={p.id} p={p} lang={lang} t={t} reveal={i % 4} />
                ))}
              </div>
            </section>
          </div>

          {/* The signature scene. On a desktop it is held while the row of categories travels sideways
              with the scroll; without motion, and on a phone, the same row is swiped or scrolled by hand. */}
          <section id="categories" data-cat-scene className="mt-24 scroll-mt-24 lg:mt-36">
            <div data-cat-track className={`no-scrollbar lg:flex lg:items-center lg:gap-12 lg:overflow-x-auto ${EDGE}`}>
              <div className="px-4 sm:px-8 lg:w-[400px] lg:shrink-0 lg:px-0">
                <h2 className={`font-heading font-bold tracking-tight ${ar ? "text-[32px] leading-[1.3] lg:text-[60px]" : "text-[34px] leading-[1.02] lg:text-[72px]"}`}>{t.shopByCat}</h2>
                <p className="mt-3 max-w-[28ch] text-[17px] text-muted-foreground lg:mt-5 lg:text-[19px]">{t.shopByCatText}</p>
              </div>
              <ul className="no-scrollbar mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-1 sm:px-8 lg:mt-0 lg:shrink-0 lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0">
                {dastaCategories.map((c) => (
                  <li key={c.key} className="w-[66vw] max-w-[320px] shrink-0 snap-start lg:w-[calc(min(56vh,540px)*0.8)] lg:max-w-none">
                    <Link href={`${BASE}/${lang}#products`} className="group block">
                      <div className="aspect-[4/5] overflow-hidden rounded-[22px] bg-muted">
                        <Image src={byId(categoryCover[c.key]).img} alt="" width={1100} height={1100} sizes="(min-width: 1024px) 432px, 66vw" className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-4 font-heading text-[22px] font-bold tracking-tight underline-offset-4 group-hover:underline lg:text-[28px]">{name(c, lang)}</p>
                      <p className="text-muted-foreground">
                        <span className="num">{dastaCount(c.key)}</span> {t.nProducts}
                      </p>
                    </Link>
                  </li>
                ))}
                <li className="w-[66vw] max-w-[320px] shrink-0 snap-start lg:w-[calc(min(56vh,540px)*0.8)] lg:max-w-none">
                  <Link href={`${BASE}/${lang}#products`} className="group block">
                    <div className="flex aspect-[4/5] flex-col justify-between rounded-[22px] bg-card p-6 transition-colors group-hover:bg-accent lg:p-8">
                      <span className="num font-heading text-[64px] font-bold leading-none tracking-tight lg:text-[88px]">{dastaProducts.length}</span>
                      <span className="grid size-14 place-items-center self-end rounded-full bg-primary text-primary-foreground">
                        <ArrowRight className="size-6 rtl:rotate-180" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="mt-4 font-heading text-[22px] font-bold tracking-tight underline-offset-4 group-hover:underline lg:text-[28px]">{t.all}</p>
                    <p className="text-muted-foreground">
                      <span className="num">{dastaCategories.length}</span> {t.nCategories}
                    </p>
                  </Link>
                </li>
              </ul>
            </div>
          </section>

          {/* A quiet scene after the strong one: the three steps really are a sequence, so they are numbered. */}
          <section id="how" className="mx-auto grid max-w-[1240px] scroll-mt-24 gap-x-16 gap-y-8 px-4 pb-24 pt-24 sm:px-8 lg:grid-cols-[1fr_1.5fr] lg:pb-40 lg:pt-36">
            <div>
              <h2 className="font-heading text-[30px] font-bold tracking-tight sm:text-[44px] rtl:leading-[1.4]">{t.howTitle}</h2>
              <p className="mt-3 max-w-[30ch] text-[17px] text-muted-foreground">{t.howText}</p>
            </div>
            <ol>
              {t.steps.map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-t border-border py-6 last:border-b sm:grid-cols-[5rem_1fr] sm:py-8">
                  <span className="num font-heading text-[36px] font-bold leading-none text-primary sm:text-[48px]" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-[22px] font-bold tracking-tight sm:text-[26px]">{title}</h3>
                    <p className="mt-1.5 max-w-[46ch] text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <div data-curtain-end />
        </main>
      </ViewTransition>
      <Footer lang={lang} t={t} closing />
      <TabBar lang={lang} t={t} active="home" />
      <HomeMotion />
    </>
  );
}
