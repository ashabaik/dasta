import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import { asLocale, getDict } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { signOut } from "./actions";
import { LocaleSwitch } from "@/components/locale-switch";
import { Logo } from "@/components/ui";

const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "500", "600"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Makbas", template: "%s · Makbas" },
  description: "Makbas: a demo B2B marketplace for industrial spare parts with anonymous sellers and escrow. Sample data only.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const viewer = await getViewer();
  const dashboard = viewer ? `/${locale}/${viewer.role}` : null;
  const code = viewer?.sellerCode ?? viewer?.buyerCode ?? null;

  return (
    <html lang={locale} dir={t.dir} className={`${plexSans.variable} ${plexArabic.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <p className="bg-held-bg px-4 py-1.5 text-center text-[13px] font-medium text-held" role="note">
          {t.demoNotice}
        </p>
        <header className="border-b border-line bg-paper">
          <div className="wrap flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
            <Link href={`/${locale}`} className="flex items-center gap-2.5 text-xl font-semibold text-ink no-underline">
              <Logo />
              {t.brand}
            </Link>
            <form action={`/${locale}`} className="order-last flex min-w-0 basis-full gap-2 sm:order-none sm:flex-1 sm:basis-auto" role="search">
              <input name="q" type="search" className="input" placeholder={t.search.placeholder} aria-label={t.search.placeholder} />
              <button type="submit" className="btn btn-ghost shrink-0">
                {t.search.submit}
              </button>
            </form>
            <nav className="ms-auto flex flex-wrap items-center gap-2">
              <LocaleSwitch locale={locale} label={t.otherLanguage} />
              {viewer && dashboard ? (
                <>
                  <Link href={dashboard} className="btn btn-ghost">
                    {t.roles[viewer.role]}
                    {code ? <span className="code text-muted">{code}</span> : null}
                  </Link>
                  <form action={signOut}>
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="btn btn-ghost">
                      {t.nav.signOut}
                    </button>
                  </form>
                </>
              ) : (
                <Link href={`/${locale}/signin`} className="btn">
                  {t.nav.signIn}
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="wrap flex-1 pb-12">{children}</main>
        <footer className="border-t border-line py-5 text-[13px] text-muted">
          <div className="wrap space-y-1">
            <p>{t.footer.line}</p>
            <p>{t.footer.assumption}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
