import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import { asLocale, getDict } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { signOut } from "./actions";
import { LocaleSwitch } from "@/components/locale-switch";
import { IconChat, IconSearch, Logo } from "@/components/ui";

const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "500", "600", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDict(asLocale((await params).locale));
  return {
    title: { default: t.brand, template: `%s · ${t.brand}` },
    description: `${t.brand}: ${t.tagline}. ${t.demoNotice}.`,
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e1a29" };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const viewer = await getViewer();
  const dashboard = viewer ? `/${locale}/${viewer.role}` : null;
  const code = viewer?.sellerCode ?? viewer?.buyerCode ?? null;

  return (
    <html lang={locale} dir={t.dir} className={`${plexSans.variable} ${plexArabic.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <p className="bg-accent px-4 py-1.5 text-center text-[13px] font-semibold text-[#2a1000]" role="note">
          {t.demoNotice}
        </p>
        <header className="sticky top-0 z-30 border-b border-navy-line bg-navy text-white shadow-[0_2px_14px_rgb(0_0_0/0.25)]">
          <div className="wrap flex flex-wrap items-center gap-x-4 gap-y-2.5 py-3">
            <Link href={`/${locale}`} className="flex items-center gap-2.5 text-[22px] font-bold tracking-tight text-white no-underline">
              <Logo />
              {t.brand}
            </Link>
            <form action={`/${locale}`} className="order-last flex min-w-0 basis-full overflow-hidden rounded-lg bg-white md:order-none md:flex-1 md:basis-auto" role="search">
              <input name="q" type="search" className="min-h-10 min-w-0 flex-1 border-0 bg-transparent px-3.5 text-[15px] text-ink outline-none placeholder:text-muted" placeholder={t.search.placeholder} aria-label={t.search.placeholder} />
              <button type="submit" className="flex shrink-0 items-center gap-1.5 bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark">
                <IconSearch size={18} />
                <span className="hidden sm:inline">{t.search.submit}</span>
              </button>
            </form>
            <nav className="ms-auto flex flex-wrap items-center gap-2">
              <LocaleSwitch locale={locale} label={t.otherLanguage} />
              {viewer && dashboard ? (
                <>
                  <Link href={`/${locale}/messages`} className="btn btn-ondark">
                    <IconChat size={17} />
                    <span className="hidden sm:inline">{t.chat.title}</span>
                  </Link>
                  <Link href={dashboard} className="btn btn-ondark">
                    {t.roles[viewer.role]}
                    {code ? <span className="code text-white/70">{code}</span> : null}
                  </Link>
                  <form action={signOut}>
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="btn btn-ondark">
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

        <main className="wrap flex-1 pb-14">{children}</main>

        <footer className="mt-6 bg-navy text-white/75">
          <div className="wrap grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xl font-bold text-white">
                <Logo size={28} />
                {t.brand}
              </div>
              <p className="max-w-md text-sm">{t.footer.line}</p>
              <p className="max-w-md text-[13px] text-white/55">{t.footer.assumption}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t.foot.explore}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href={`/${locale}`} className="text-white/75 no-underline hover:text-white">
                    {t.foot.catalogue}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/about`} className="text-white/75 no-underline hover:text-white">
                    {t.about.link}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/credits`} className="text-white/75 no-underline hover:text-white">
                    {t.media.creditsLink}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t.foot.demo}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href={`/${locale}/signin`} className="text-white/75 no-underline hover:text-white">
                    {t.foot.signIn}
                  </Link>
                </li>
                <li className="text-white/55">{t.demoNotice}</li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
