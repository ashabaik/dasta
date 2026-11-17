import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { BadgeCheck, ClipboardList, Home, LayoutGrid, MessageSquare, Search, User } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { PORTFOLIO_URL, money, name, unit, type Lang, type Product, type T } from "./data";

// "Dasta", the chosen direction: B's structure with A's calm.
// From B: search in the middle of the header, category chips, heavy headings, the dashboards,
// the phone tab bar and the price / minimum quantity / supplier code under each product.
// From A: tall photographs with nothing around them, a white page with room to breathe,
// a light hero photograph and one deep green. Typefaces are B's throughout.

export const BASE = "/mockups/ab";

export function Wordmark({ lang, onDark = false }: { lang: Lang; onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-heading text-[22px] font-bold leading-none tracking-tight">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect width="30" height="30" rx="9" fill={onDark ? "#fff" : "var(--primary)"} />
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <circle key={`${r}${c}`} cx={7.5 + c * 5} cy={10 + r * 5} r="1.6" fill={onDark ? "var(--primary)" : "#fff"} opacity={r === 2 && c === 3 ? 0.45 : 1} />))}
      </svg>
      {lang === "ar" ? "دستة" : "Dasta"}
    </span>
  );
}

/** `account` is the signed-in supplier or buyer code; without it the header is the public one. */
export function Header({ lang, t, path = "", account }: { lang: Lang; t: T; path?: string; account?: string }) {
  const other = lang === "ar" ? "en" : "ar";
  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
        <Link href={`${BASE}/${lang}`} className="inline-flex min-h-11 items-center text-foreground">
          <Wordmark lang={lang} />
        </Link>
        <form role="search" className="relative order-last basis-full md:order-none md:mx-auto md:max-w-[520px] md:flex-1 md:basis-auto">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="ab-search" type="search" placeholder={t.search} aria-label={t.search} className="h-12 rounded-full border-input bg-background ps-11 text-base shadow-none" />
        </form>
        <div className="ms-auto flex items-center gap-1.5">
          {account ? (
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
              <Button asChild variant="ghost" className="h-11 rounded-full px-3.5 text-[15px]">
                <Link href={`${BASE}/${lang}/dashboard`}>{t.orders}</Link>
              </Button>
              <Button asChild variant="ghost" className="h-11 rounded-full px-3.5 text-[15px]">
                <Link href={`${BASE}/${lang}/dashboard`}>{t.inbox}</Link>
              </Button>
            </nav>
          ) : (
            <Button asChild variant="ghost" className="hidden h-11 rounded-full px-3.5 text-[15px] lg:inline-flex">
              <Link href={`${BASE}/${lang}/signin`}>{t.sellOn}</Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="h-11 rounded-full px-3.5 text-[15px]">
            <Link href={`${BASE}/${other}${path}`} lang={other}>
              {t.other}
            </Link>
          </Button>
          {account ? (
            <Link href={`${BASE}/${lang}/dashboard`} className="inline-flex h-11 items-center gap-2 rounded-full bg-card pe-4 ps-1.5 text-[15px] font-medium">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <User className="size-4" aria-hidden="true" />
              </span>
              <span className="num">{account}</span>
            </Link>
          ) : (
            <Button asChild className="h-11 rounded-full px-5 text-[15px]">
              <Link href={`${BASE}/${lang}/signin`}>{t.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

/** Phone navigation: five places, always under the thumb. Hidden from the desktop layout. */
export function TabBar({ lang, t, active }: { lang: Lang; t: T; active?: "home" | "orders" | "account" }) {
  const items = [
    { key: "home", label: t.home, Icon: Home, href: `${BASE}/${lang}` },
    { key: "cats", label: t.categories, Icon: LayoutGrid, href: `${BASE}/${lang}#categories` },
    { key: "inbox", label: t.inbox, Icon: MessageSquare, href: `${BASE}/${lang}/dashboard` },
    { key: "orders", label: t.orders, Icon: ClipboardList, href: `${BASE}/${lang}/dashboard` },
    { key: "account", label: t.account, Icon: User, href: `${BASE}/${lang}/signin` },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ key, label, Icon, href }) => (
          <li key={key}>
            <Link href={href} aria-current={key === active ? "page" : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[12px] font-medium ${key === active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="size-[22px]" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The end of every page: on the home page it opens with the closing line and fills the last screen
 * (`closing`); on working pages it is the same footer without the line.
 */
export function Footer({ lang, t, closing = false, path = "" }: { lang: Lang; t: T; closing?: boolean; path?: string }) {
  const other = lang === "ar" ? "en" : "ar";
  const home = `${BASE}/${lang}`;
  const cols = [
    { title: t.fMarket, links: [[t.all, `${home}#products`], [t.shopByCat, `${home}#categories`]] },
    { title: t.fSelling, links: [[t.sellOn, `${home}/signin`], [t.dashboard, `${home}/dashboard`]] },
    { title: t.fSafety, links: [[t.howTitle, `${home}#how`], [t.signIn, `${home}/signin`]] },
  ];
  return (
    <footer className={`on-dark bg-primary text-primary-foreground ${closing ? "last-screen flex flex-col" : "mt-24"}`}>
      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 sm:px-8">
        {closing ? (
          <div className="flex flex-1 flex-col justify-center py-16 lg:py-20">
            <h2 data-closing-text className={`max-w-[13ch] font-heading font-bold tracking-tight ${lang === "ar" ? "text-[clamp(38px,5.6vw,84px)] leading-[1.25]" : "text-[clamp(42px,6.2vw,96px)] leading-[1]"}`}>
              {t.closing}
            </h2>
            <p data-closing-fade className="mt-5 max-w-[42ch] text-[18px] text-primary-foreground/85 sm:text-[20px]">
              {t.closingText}
            </p>
            <div data-closing-fade className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button asChild className="h-13 rounded-full bg-white px-7 text-[17px] text-primary hover:bg-white/90">
                <Link href={`${home}/signin`}>{t.createAccount}</Link>
              </Button>
              <Link href={`${home}/signin`} className="inline-flex min-h-11 items-center text-[17px] font-medium underline underline-offset-4">
                {t.sellOn}
              </Link>
            </div>
          </div>
        ) : null}

        <div className="grid gap-x-8 gap-y-9 border-t border-white/25 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Wordmark lang={lang} onDark />
            <p className="mt-3 max-w-[30ch] text-primary-foreground/85">{t.tagline}</p>
            <Link href={`${BASE}/${other}${path}`} lang={other} className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
              {t.other}
            </Link>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h3 className="font-heading text-[18px] font-bold">{c.title}</h3>
              <ul className="mt-1">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="inline-flex min-h-11 items-center text-primary-foreground/90 underline-offset-4 hover:text-primary-foreground hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1 border-t border-white/25 pb-24 pt-4 text-sm text-primary-foreground/85 lg:pb-4">
          <p>{t.sample}</p>
          <a href={PORTFOLIO_URL} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary-foreground">
            {t.footer}
          </a>
        </div>
      </div>
    </footer>
  );
}

/** A tall photograph with nothing around it; the trade terms sit underneath. */
export function Card({ p, lang, t, reveal = false }: { p: Product; lang: Lang; t: T; reveal?: boolean }) {
  const photo = <Image src={p.img} alt="" width={1100} height={1100} sizes="(min-width: 1024px) 285px, (min-width: 640px) 31vw, 46vw" className="h-full w-full object-cover" />;
  return (
    <Link href={`${BASE}/${lang}/product`} className="group block">
      <div className="aspect-[4/5] overflow-hidden rounded-[18px] bg-muted" data-photo-reveal={reveal ? "" : undefined}>
        {/* The product page opens on the mugs: that photograph travels with the click. */}
        {p.id === "mugs" ? (
          <ViewTransition name="photo-mugs" share="morph" default="none">
            {photo}
          </ViewTransition>
        ) : (
          photo
        )}
      </div>
      <h3 className="mt-3.5 text-[16px] font-medium leading-snug underline-offset-4 group-hover:underline">{name(p, lang)}</h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[18px] font-semibold">
        <span className="num">{money(p.price)}</span>
        <span className="text-sm font-normal text-muted-foreground">
          {t.egp} / {unit(p, lang)}
        </span>
      </p>
      <p className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
        <span>
          {t.moq} <span className="num text-foreground">{money(p.moq)}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <BadgeCheck className="size-4 text-primary" aria-label={t.verified} />
          <span className="num">{p.supplier}</span>
        </span>
      </p>
    </Link>
  );
}
