import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { asLang, categories, countIn, dict, name, products } from "@/mockups/data";
import { BASE, Footer, Header, Row } from "@/mockups/c";

export default async function HomeC({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const ar = lang === "ar";
  const [lead, rest] = t.heroC.split(/[,،]\s*/);
  // Counted from the sample catalogue itself, never typed in.
  const facts: [number, string][] = [
    [products.length, t.nProducts],
    [new Set(products.map((x) => x.supplier)).size, t.nSuppliers],
    [categories.length, t.nCategories],
  ];
  const roles = [t.asBuyer, t.asSupplier, t.asAdmin];

  return (
    <>
      <Header lang={lang} t={t} />
      <main>
        <section className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-8 sm:pt-14">
          <h1 className={`font-heading font-black ${ar ? "text-[clamp(44px,10.5vw,88px)] leading-[1.35]" : "text-[clamp(52px,13.4vw,124px)] uppercase leading-[0.95]"}`}>
            {lead}
            {ar ? "،" : ","}
            <br />
            <span className="mark">{rest}</span>
          </h1>
          <div className="mt-6 grid gap-7 sm:mt-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-[46ch] text-[18px] leading-relaxed">{t.heroCSub}</p>
            <dl className="flex gap-8 sm:gap-12">
              {facts.map(([n, label]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="mt-1.5 text-sm text-muted-foreground">{label}</dt>
                  <dd className="cond num font-heading text-[44px] font-black leading-none">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <div className="mt-8 h-[190px] sm:mt-12 sm:h-[380px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mk/warehouse.jpg" alt="" className="h-full w-full object-cover" />
        </div>

        {/* The catalogue: an index of categories beside the list it filters. */}
        <section id="products" className="mx-auto grid max-w-[1280px] scroll-mt-6 gap-x-14 px-4 pt-8 sm:px-8 sm:pt-16 lg:grid-cols-[230px_1fr]">
          <nav aria-label={t.categories} className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <h2 className="hidden font-heading text-[24px] font-black ltr:uppercase lg:block">{t.categories}</h2>
            <ul className="-mx-4 flex gap-x-6 overflow-x-auto px-4 text-[16px] lg:mx-0 lg:mt-3 lg:block lg:border-t-2 lg:border-foreground lg:px-0">
              <li className="shrink-0 lg:border-b lg:border-input">
                <Link href={`${BASE}/${lang}#products`} aria-current="true" className="flex min-h-[48px] items-center justify-between gap-2 font-semibold">
                  <span className="mark">{t.all}</span>
                  <span className="num text-sm text-muted-foreground">{products.length}</span>
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.key} className="shrink-0 lg:border-b lg:border-input">
                  <Link href={`${BASE}/${lang}#products`} className="flex min-h-[48px] items-center justify-between gap-2 underline-offset-4 hover:underline">
                    {name(c, lang)}
                    <span className="num text-sm text-muted-foreground">{countIn(c.key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 min-w-0 lg:mt-0">
            <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-3">
              <h2 className="font-heading text-[32px] font-black leading-none ltr:uppercase sm:text-[46px] rtl:leading-[1.3]">{t.newIn}</h2>
              <p className="text-sm text-muted-foreground">
                <span className="num">{products.length}</span> {t.nProducts}
              </p>
            </div>
            <div className="grid gap-x-12 md:grid-cols-2">
              {products.slice(0, 12).map((p) => (
                <Row key={p.id} p={p} lang={lang} t={t} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 bg-muted">
          <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">
            <h2 className="font-heading text-[32px] font-black leading-none ltr:uppercase sm:text-[46px] rtl:leading-[1.3]">{t.howTitle}</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-12">
              {t.steps.map(([title, text], i) => (
                <li key={title} className="border-t-2 border-foreground pt-4">
                  <span className="cond num font-heading text-[64px] font-black leading-none" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 text-[20px] font-semibold">{title}</h3>
                  <p className="mt-1.5 max-w-[38ch] text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Three ways in, set as lines of an index. */}
        <section className="mx-auto max-w-[1280px] px-4 pt-14 sm:px-8">
          <ul className="border-t-2 border-foreground">
            {roles.map((r) => (
              <li key={r} className="border-b border-input">
                <Link href={`${BASE}/${lang}/dashboard`} className="group flex items-center justify-between gap-4 py-4 sm:py-5">
                  <span className="cond font-heading text-[30px] font-black leading-tight ltr:uppercase sm:text-[52px] rtl:leading-[1.4]">
                    <span className="group-hover:[background:var(--accent)]">{r}</span>
                  </span>
                  <ArrowRight className="size-7 shrink-0 transition-transform group-hover:translate-x-1 sm:size-9 rtl:rotate-180 rtl:group-hover:-translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer lang={lang} t={t} />
    </>
  );
}
