import Link from "next/link";
import { ArrowRight, BadgeCheck, Briefcase, CookingPot, MessageSquare, Package, Shirt, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { asLang, categories, countIn, dict, name, products } from "@/mockups/data";
import { BASE, Card, Footer, Header, TabBar } from "@/mockups/b";
import { Lift } from "@/mockups/motion";

const CAT_ICON: Record<string, typeof Package> = { home: CookingPot, office: Briefcase, packaging: Package, textiles: Shirt, care: Sparkles, tools: Wrench };

export default async function HomeB({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const points = [
    { Icon: BadgeCheck, title: t.verified, text: t.verifiedText },
    { Icon: ShieldCheck, title: t.protectedPay, text: t.protectedPayText },
    { Icon: MessageSquare, title: t.messages, text: t.messagesText },
  ];

  return (
    <>
      <Header lang={lang} t={t} />
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section className="pt-4 sm:pt-8">
          <h1 className="max-w-[18ch] font-heading text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[52px] rtl:leading-[1.35]" style={{ textWrap: "balance" }}>
            {t.heroB}
          </h1>
          <p className="mt-3 max-w-[52ch] text-[17px] text-muted-foreground">{t.heroBSub}</p>
        </section>

        {/* Categories: one tap each, scrolls sideways on a phone. */}
        <nav aria-label={t.categories} className="-mx-4 mt-6 sm:mx-0">
          <ul className="flex gap-2.5 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
            {categories.map((c, i) => {
              const Icon = CAT_ICON[c.key];
              return (
                <li key={c.key} className="shrink-0">
                  <Link
                    href={`${BASE}/${lang}#products`}
                    className={`flex h-12 items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors ${i === 0 ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                    {name(c, lang)}
                    <span className={`num text-[13px] ${i === 0 ? "text-background/70" : "text-muted-foreground"}`}>{countIn(c.key)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* One wide photograph and three plain promises beside it. */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="relative min-h-[240px] overflow-hidden rounded-[28px] sm:min-h-[340px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mk/warehouse.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1220]/85 via-[#0c1220]/25 to-transparent" />
            <div className="on-dark absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 text-white sm:p-7">
              <p className="max-w-[20ch] font-heading text-[26px] font-bold leading-tight sm:text-[34px]">{t.steps[0][0]}</p>
              <Button asChild className="h-12 rounded-full bg-white px-5 text-[15px] text-[#0c1220] hover:bg-white/90">
                <Link href={`${BASE}/${lang}#products`}>
                  {t.explore}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {points.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3.5 rounded-[22px] bg-card p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="size-[22px]" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold">{title}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="products" className="scroll-mt-24 pt-10">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-heading text-[26px] font-bold tracking-tight sm:text-[32px]">{t.newIn}</h2>
            <Link href={`${BASE}/${lang}#products`} className="inline-flex min-h-11 items-center text-[15px] font-medium text-primary underline-offset-4 hover:underline">
              {t.all}
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
            {products.slice(0, 12).map((p) => (
              <Card key={p.id} p={p} lang={lang} t={t} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <Lift className="on-dark flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-primary p-6 text-primary-foreground sm:p-8">
            <p className="max-w-[26ch] font-heading text-[24px] font-bold leading-tight sm:text-[30px]">
              {t.asAny}
            </p>
            <Button asChild className="h-12 rounded-full bg-white px-6 text-[15px] text-primary hover:bg-white/90">
              <Link href={`${BASE}/${lang}/dashboard`}>{t.dashboard}</Link>
            </Button>
          </Lift>
        </section>
      </main>
      <Footer t={t} />
      <TabBar lang={lang} t={t} active="home" />
    </>
  );
}
