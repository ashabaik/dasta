import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { PORTFOLIO_URL, money, name, unit, type Lang, type Product, type T } from "./data";

// Direction C, "Sanf": a printed trade catalogue. Black on white, condensed heavy headings,
// one saffron highlighter. Products are rows in an index, not cards in a grid; a few strong
// rules do the organising and nothing sits in a box.

export const BASE = "/mockups/c";

export function Wordmark({ lang, onDark = false }: { lang: Lang; onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-heading text-[26px] font-black leading-none">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" fill="currentColor" />
        <rect x="6" y="6" width="14" height="6" fill="var(--accent)" />
        <rect x="6" y="15" width="8" height="5" fill={onDark ? "#0b0b0b" : "#fff"} />
      </svg>
      <span className="cond ltr:uppercase">{lang === "ar" ? "صنف" : "Sanf"}</span>
    </span>
  );
}

export function Header({ lang, t, path = "" }: { lang: Lang; t: T; path?: string }) {
  const other = lang === "ar" ? "en" : "ar";
  return (
    <header className="border-b-2 border-foreground">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 sm:px-8">
        <Link href={`${BASE}/${lang}`} className="inline-flex min-h-11 items-center text-foreground">
          <Wordmark lang={lang} />
        </Link>
        <form role="search" className="relative order-last basis-full md:order-none md:ms-6 md:max-w-[420px] md:flex-1 md:basis-auto">
          <Search className="pointer-events-none absolute start-0 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="c-search" type="search" placeholder={t.search} aria-label={t.search} className="h-11 rounded-none border-0 border-b border-foreground bg-transparent ps-7 text-base shadow-none" />
        </form>
        <nav className="ms-auto flex items-center gap-1 text-[15px] font-medium" aria-label="Main">
          <Link href={`${BASE}/${lang}/dashboard`} className="hidden px-3 py-2.5 underline-offset-4 hover:underline lg:block">
            {t.dashboard}
          </Link>
          <Link href={`${BASE}/${other}${path}`} lang={other} className="px-3 py-2.5 underline-offset-4 hover:underline">
            {t.other}
          </Link>
          <Button asChild className="hidden h-11 rounded-none px-4 text-[15px] sm:inline-flex">
            <Link href={`${BASE}/${lang}/dashboard`}>
              {t.asSupplier}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function Footer({ lang, t }: { lang: Lang; t: T }) {
  return (
    <footer className="on-dark mt-20 bg-foreground text-background">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-6 px-4 py-10 sm:px-8">
        <div>
          <Wordmark lang={lang} onDark />
          <p className="mt-3 max-w-[40ch] text-sm text-background/75">{t.sample}</p>
        </div>
        <a href={PORTFOLIO_URL} className="inline-flex min-h-11 items-center text-sm text-background/85 underline underline-offset-4 hover:text-background">
          {t.footer}
        </a>
      </div>
    </footer>
  );
}

/** One line of the catalogue: photograph, name, terms, price. */
export function Row({ p, lang, t }: { p: Product; lang: Lang; t: T }) {
  return (
    <Link href={`${BASE}/${lang}/product`} className="group grid grid-cols-[104px_1fr] gap-4 border-b border-input py-4 sm:grid-cols-[148px_1fr] sm:gap-5 sm:py-5">
      <div className="aspect-square overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="flex min-w-0 flex-col">
        <h3 className="text-[17px] font-semibold leading-snug underline-offset-4 group-hover:underline">{name(p, lang)}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.moq} <span className="num text-foreground">{money(p.moq)}</span> · {t.lead} <span className="num text-foreground">{p.lead}</span> {t.days}
        </p>
        <p className="mt-auto flex items-end justify-between gap-3 pt-3">
          <span>
            <span className="cond num font-heading text-[30px] font-black leading-none sm:text-[34px]">{money(p.price)}</span>{" "}
            <span className="text-sm text-muted-foreground">
              {t.egp} / {unit(p, lang)}
            </span>
          </span>
          <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground rtl:-scale-x-100" aria-hidden="true" />
        </p>
      </div>
    </Link>
  );
}
