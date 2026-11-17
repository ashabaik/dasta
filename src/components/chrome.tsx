import Link from "next/link";
import { LogOut, MessageSquare, Search, User } from "lucide-react";
import type { Dict, Locale } from "@/lib/i18n";
import type { Viewer } from "@/lib/session";
import { signOut } from "@/app/[locale]/actions";
import { LocaleSwitch } from "@/components/locale-switch";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Wordmark } from "@/components/ui";

export const PORTFOLIO_URL = "https://ashabaik.github.io";

const ghost = "h-11 items-center rounded-full px-3.5 text-[15px] font-medium transition-colors duration-200 hover:bg-card";

/** Search sits in the middle. The right side depends on who is looking: a visitor, or a signed-in account. */
export function Header({ locale, t, viewer }: { locale: Locale; t: Dict; viewer: Viewer | null }) {
  const code = viewer?.sellerCode ?? viewer?.buyerCode ?? null;
  return (
    <header className="sticky top-0 z-30 bg-background lg:bg-background/90 lg:backdrop-blur">
      <div className="wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <Link href={`/${locale}`} className="inline-flex min-h-11 items-center text-foreground">
          <Wordmark locale={locale} />
        </Link>
        <form action={`/${locale}`} role="search" className="relative order-last basis-full md:order-none md:mx-auto md:max-w-[520px] md:flex-1 md:basis-auto">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input name="q" type="search" placeholder={t.search.placeholder} aria-label={t.search.placeholder} className="rounded-full pe-4 ps-11" />
        </form>
        <div className="ms-auto flex items-center gap-1">
          {viewer ? (
            <Link href={`/${locale}/messages`} className={`${ghost} hidden gap-2 lg:inline-flex`}>
              <MessageSquare className="size-[18px]" aria-hidden="true" />
              {t.nav.messages}
            </Link>
          ) : (
            <Link href={`/${locale}/signin#supplier`} className={`${ghost} hidden lg:inline-flex`}>
              {t.nav.sell}
            </Link>
          )}
          <LocaleSwitch locale={locale} label={t.otherLanguage} className={`${ghost} inline-flex`} />
          {viewer ? (
            <>
              <Link href={`/${locale}/${viewer.role}`} className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-card pe-4 ps-1.5 text-[15px] font-medium transition-colors duration-200 hover:bg-accent">
                <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                  <User className="size-4" aria-hidden="true" />
                </span>
                <span className="hidden sm:inline">{t.roles[viewer.role]}</span>
                {code ? <span className="num">{code}</span> : null}
              </Link>
              <form action={signOut}>
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="grid size-11 cursor-pointer place-items-center rounded-full transition-colors duration-200 hover:bg-card" aria-label={t.nav.signOut} title={t.nav.signOut}>
                  <LogOut className="size-[18px] rtl:-scale-x-100" aria-hidden="true" />
                </button>
              </form>
            </>
          ) : (
            <Button asChild>
              <Link href={`/${locale}/signin`}>{t.nav.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * The end of every page. On the home page it opens with the closing line and fills the last screen
 * (`closing`); on working pages it is the same footer without the line.
 */
export function Footer({ locale, t, closing = false, className = "" }: { locale: Locale; t: Dict; closing?: boolean; className?: string }) {
  const home = `/${locale}`;
  const cols: { title: string; links: [string, string][] }[] = [
    { title: t.footer.market, links: [[t.catalogue.title, `${home}?view=all`], [t.catalogue.shopByCategory, `${home}#categories`]] },
    { title: t.footer.selling, links: [[t.nav.sell, `${home}/signin#supplier`], [t.sellerDash.title, `${home}/seller`]] },
    { title: t.footer.help, links: [[t.home.howTitle, `${home}#how`], [t.about.link, `${home}/about`], [t.nav.signIn, `${home}/signin`]] },
  ];
  return (
    <footer className={`on-dark bg-primary text-primary-foreground ${closing ? "last-screen flex flex-col" : ""} ${className}`}>
      <div className="wrap flex flex-1 flex-col">
        {closing ? (
          <div className="flex flex-1 flex-col justify-center py-16 lg:py-20">
            <h2 data-closing-text className={`max-w-[13ch] font-heading font-bold tracking-tight ${locale === "ar" ? "text-[clamp(38px,5.6vw,84px)] leading-[1.25]" : "text-[clamp(42px,6.2vw,96px)] leading-[1]"}`}>
              {t.home.closing}
            </h2>
            <p data-closing-fade className="mt-5 max-w-[42ch] text-[18px] text-primary-foreground/85 sm:text-[20px]">
              {t.home.closingText}
            </p>
            <div data-closing-fade className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button asChild variant="onDark" size="lg">
                <Link href={`${home}/signin`}>{t.nav.createAccount}</Link>
              </Button>
              <Link href={`${home}/signin#supplier`} className="inline-flex min-h-11 items-center text-[17px] font-medium underline underline-offset-4">
                {t.nav.sell}
              </Link>
            </div>
          </div>
        ) : null}

        <div className="grid gap-x-8 gap-y-9 border-t border-white/25 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Wordmark locale={locale} onDark />
            <p className="mt-3 max-w-[30ch] text-primary-foreground/85">{t.tagline}</p>
            <LocaleSwitch locale={locale} label={t.otherLanguage} className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4" />
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="font-heading text-[18px] font-bold">{c.title}</h2>
              <ul className="mt-1">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} prefetch={false} className="inline-flex min-h-11 items-center text-primary-foreground/90 underline-offset-4 hover:text-primary-foreground hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1 border-t border-white/25 pb-24 pt-4 text-sm text-primary-foreground/85 lg:pb-4">
          <p>{t.footer.sample}</p>
          <a href={PORTFOLIO_URL} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary-foreground">
            {t.footer.portfolio}
          </a>
        </div>
      </div>
    </footer>
  );
}
