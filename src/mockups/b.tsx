import Link from "next/link";
import { BadgeCheck, ClipboardList, Home, LayoutGrid, MessageSquare, Plus, Search, User } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Lift } from "./motion";
import { PORTFOLIO_URL, money, name, unit, type Lang, type Product, type T } from "./data";

// Direction B, "Dasta": an app. Cool light ground, white surfaces, large radius, one cobalt.
// Search comes first; on a phone the navigation sits in a bar at the bottom, under the thumb.

export const BASE = "/mockups/b";

export function Wordmark({ lang }: { lang: Lang }) {
  return (
    <span className="flex items-center gap-2.5 font-heading text-[22px] font-bold leading-none tracking-tight">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect width="30" height="30" rx="9" fill="var(--primary)" />
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <circle key={`${r}${c}`} cx={7.500 + c * 5} cy={10 + r * 5} r="1.600" fill="#fff" opacity={r === 2 && c === 3 ? 0.45 : 1} />))}
      </svg>
      {lang === "ar" ? "دستة" : "Dasta"}
    </span>
  );
}

export function Header({ lang, t, path = "" }: { lang: Lang; t: T; path?: string }) {
  const other = lang === "ar" ? "en" : "ar";
  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link href={`${BASE}/${lang}`} className="inline-flex min-h-11 items-center text-foreground">
          <Wordmark lang={lang} />
        </Link>
        <form role="search" className="relative order-last basis-full md:order-none md:mx-auto md:max-w-[520px] md:flex-1 md:basis-auto">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="b-search" type="search" placeholder={t.search} aria-label={t.search} className="h-12 rounded-full border-input bg-card ps-11 text-base shadow-none" />
        </form>
        <div className="ms-auto flex items-center gap-2">
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            <Button asChild variant="ghost" className="h-10 rounded-full px-3.5 text-[15px]">
              <Link href={`${BASE}/${lang}/dashboard`}>{t.orders}</Link>
            </Button>
            <Button asChild variant="ghost" className="h-10 rounded-full px-3.5 text-[15px]">
              <Link href={`${BASE}/${lang}/dashboard`}>{t.inbox}</Link>
            </Button>
          </nav>
          <Button asChild variant="ghost" className="h-11 rounded-full px-3.5 text-[15px]">
            <Link href={`${BASE}/${other}${path}`} lang={other}>
              {t.other}
            </Link>
          </Button>
          <Button asChild className="hidden h-11 rounded-full px-4 text-[15px] sm:inline-flex">
            <Link href={`${BASE}/${lang}/dashboard`}>
              {t.asSupplier}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Phone navigation: five places, always under the thumb. Hidden from the desktop layout. */
export function TabBar({ lang, t, active }: { lang: Lang; t: T; active: "home" | "orders" }) {
  const items = [
    { key: "home", label: t.home, Icon: Home, href: `${BASE}/${lang}` },
    { key: "cats", label: t.categories, Icon: LayoutGrid, href: `${BASE}/${lang}#products` },
    { key: "inbox", label: t.inbox, Icon: MessageSquare, href: `${BASE}/${lang}/dashboard` },
    { key: "orders", label: t.orders, Icon: ClipboardList, href: `${BASE}/${lang}/dashboard` },
    { key: "account", label: t.account, Icon: User, href: `${BASE}/${lang}/dashboard` },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
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

export function Footer({ t }: { t: T }) {
  return (
    <footer className="mx-auto mt-16 max-w-[1200px] px-4 pb-28 text-sm text-muted-foreground sm:px-6 lg:pb-10">
      <a href={PORTFOLIO_URL} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">
        {t.footer}
      </a>
    </footer>
  );
}

export function Card({ p, lang, t }: { p: Product; lang: Lang; t: T }) {
  return (
    <Lift>
      <Link href={`${BASE}/${lang}/product`} className="group block">
        <div className="relative aspect-square overflow-hidden rounded-[22px] bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.img} alt="" className="h-full w-full object-cover" loading="lazy" />
          <span className="absolute bottom-2.5 end-2.5 grid size-10 place-items-center rounded-full bg-card text-foreground shadow-[0_2px_8px_rgb(12_18_32/0.16)] transition-colors group-hover:bg-primary group-hover:text-primary-foreground" aria-hidden="true">
            <Plus className="size-5" />
          </span>
        </div>
        <h3 className="mt-3 text-[15px] font-medium leading-snug">{name(p, lang)}</h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[17px] font-semibold">
          <span className="num">{money(p.price)}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {t.egp} / {unit(p, lang)}
          </span>
        </p>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
          <BadgeCheck className="me-1 inline size-4 align-[-3px] text-primary" aria-hidden="true" />
          <span className="num">{p.supplier}</span> · {t.moq} <span className="num">{money(p.moq)}</span>
        </p>
      </Link>
    </Lift>
  );
}
