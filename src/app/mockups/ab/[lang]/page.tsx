import Link from "next/link";
import { ArrowRight, BadgeCheck, Briefcase, CookingPot, MessageSquare, Package, Shirt, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { asLang, categories, countIn, dict, name, products } from "@/mockups/data";
import { BASE, Card, Footer, Header, TabBar } from "@/mockups/ab";

const CAT_ICON: Record<string, typeof Package> = { home: CookingPot, office: Briefcase, packaging: Package, textiles: Shirt, care: Sparkles, tools: Wrench };

export default async function HomeAB({ params }: { params: Promise<{ lang: string }> }) {
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
      <main className="mx-auto max-w-[1240px] px-4 sm:px-8">
        {/* Heavy heading on one side, one light photograph on the other. */}
        <section className="grid items-center gap-8 pt-5 sm:pt-10 lg:grid-cols-[1fr_1.08fr] lg:gap-16">
          <div>
            <h1 className="max-w-[14ch] font-heading text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[64px] rtl:leading-[1.3]" style={{ textWrap: "balance" }}>
              {t.heroB}
            </h1>
            <p className="mt-4 max-w-[44ch] text-[18px] text-muted-foreground">{t.heroBSub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="h-12 rounded-full px-6 text-[16px]">
                <Link href={`${BASE}/${lang}#products`}>
                  {t.explore}
                  <ArrowRight className="size-[18px] rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-12 rounded-full px-5 text-[16px] text-primary">
                <Link href={`${BASE}/${lang}/dashboard`}>{t.asSupplier}</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-[28px] bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mk/lamp.jpg" alt="" className="aspect-[4/3] w-full object-cover lg:aspect-[5/4]" />
          </div>
        </section>

        {/* Categories: one tap each, scrolls sideways on a phone. */}
        <nav aria-label={t.categories} className="-mx-4 mt-10 sm:mx-0 sm:mt-14">
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

        <section id="products" className="scroll-mt-28 pt-12 sm:pt-16">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-heading text-[28px] font-bold tracking-tight sm:text-[38px]">{t.newIn}</h2>
            <Link href={`${BASE}/${lang}#products`} className="inline-flex min-h-11 items-center text-[15px] font-medium text-primary underline-offset-4 hover:underline">
              {t.all}
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:mt-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
            {products.slice(0, 12).map((p) => (
              <Card key={p.id} p={p} lang={lang} t={t} />
            ))}
          </div>
        </section>

        {/* Three plain promises, set in open space instead of boxes. */}
        <section className="mt-20 sm:mt-28">
          <ul className="grid gap-9 md:grid-cols-3 md:gap-12">
            {points.map(({ Icon, title, text }) => (
              <li key={title}>
                <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-heading text-[22px] font-bold tracking-tight">{title}</h2>
                <p className="mt-1.5 max-w-[36ch] text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="on-dark mt-20 flex flex-wrap items-center justify-between gap-5 rounded-[28px] bg-primary p-7 text-primary-foreground sm:mt-28 sm:p-10">
          <p className="max-w-[22ch] font-heading text-[26px] font-bold leading-tight tracking-tight sm:text-[34px] rtl:leading-[1.4]">{t.asAny}</p>
          <Button asChild className="h-12 rounded-full bg-white px-6 text-[16px] text-primary hover:bg-white/90">
            <Link href={`${BASE}/${lang}/dashboard`}>{t.dashboard}</Link>
          </Button>
        </section>
      </main>
      <Footer t={t} />
      <TabBar lang={lang} t={t} active="home" />
    </>
  );
}
