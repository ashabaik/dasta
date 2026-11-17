import Link from "next/link";
import { ArrowRight, BadgeCheck, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { PORTFOLIO_URL, money, name, unit, type Lang, type Product, type T } from "./data";

// Direction A, "Raff": a gallery. White ground, serif headings, sharp corners, one deep green.
// The photograph is the object; text sits under it with no box around either.

export const BASE = "/mockups/a";

export function Wordmark({ lang }: { lang: Lang }) {
  return (
    <span className="flex items-center gap-2 font-heading text-[28px] leading-none tracking-tight">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <path d="M2 6h18M2 12h18M2 18h18" stroke="currentColor" strokeWidth="2" />
        <rect x="5" y="2" width="4" height="4" fill="var(--primary)" />
        <rect x="12" y="8" width="5" height="4" fill="var(--primary)" />
      </svg>
      {lang === "ar" ? "رفّ" : "Raff"}
    </span>
  );
}

export function Header({ lang, t, path = "" }: { lang: Lang; t: T; path?: string }) {
  const other = lang === "ar" ? "en" : "ar";
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-4 sm:px-8">
        <Link href={`${BASE}/${lang}`} className="inline-flex min-h-11 items-center text-foreground">
          <Wordmark lang={lang} />
        </Link>
        <nav className="ms-6 hidden items-center gap-7 text-[15px] md:flex" aria-label="Main">
          <Link href={`${BASE}/${lang}#products`} className="hover:text-primary">
            {t.categories}
          </Link>
          <Link href={`${BASE}/${lang}/dashboard`} className="hover:text-primary">
            {t.dashboard}
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href={`${BASE}/${lang}#search`} aria-label={t.search}>
              <Search className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 px-3 text-[15px]">
            <Link href={`${BASE}/${other}${path}`} lang={other}>
              {t.other}
            </Link>
          </Button>
          <Button asChild className="hidden h-11 px-4 text-[15px] sm:inline-flex">
            <Link href={`${BASE}/${lang}/dashboard`}>
              {t.asSupplier}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function Footer({ lang, t }: { lang: Lang; t: T }) {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:px-8">
        <Wordmark lang={lang} />
        <a href={PORTFOLIO_URL} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">
          {t.footer}
        </a>
      </div>
    </footer>
  );
}

export function Card({ p, lang, t }: { p: Product; lang: Lang; t: T }) {
  return (
    <Link href={`${BASE}/${lang}/product`} className="group block">
      <div className="aspect-[4/5] overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" loading="lazy" />
      </div>
      <h3 className="mt-3.5 text-[16px] font-medium leading-snug text-foreground">{name(p, lang)}</h3>
      <p className="mt-1 text-[15px] text-foreground">
        <span className="text-muted-foreground">{t.from}</span> <span className="num font-semibold">{money(p.price)}</span> {t.egp}
        <span className="text-muted-foreground"> / {unit(p, lang)}</span>
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t.moq} <span className="num">{money(p.moq)}</span>
      </p>
    </Link>
  );
}

export function Promise({ t }: { t: T }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
      <li className="flex items-center gap-2">
        <BadgeCheck className="size-[18px] text-primary" aria-hidden="true" />
        {t.verified}
      </li>
      <li className="flex items-center gap-2">
        <ShieldCheck className="size-[18px] text-primary" aria-hidden="true" />
        {t.protectedPay}
      </li>
    </ul>
  );
}

export function More({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-primary underline-offset-4 hover:underline">
      {label}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
