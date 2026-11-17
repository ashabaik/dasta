import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Bricolage_Grotesque, Readex_Pro } from "next/font/google";
import "../globals.css";
import { asLocale, getDict } from "@/lib/i18n";
import { getViewer } from "@/lib/session";
import { Footer, Header } from "@/components/chrome";
import { TabBar } from "@/components/tab-bar";

// English headings use the display face; it is not preloaded, so the Arabic pages (which never use it)
// do not download it. Text in both languages uses one family drawn for both scripts.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-display", preload: false });
const body = Readex_Pro({ subsets: ["latin", "arabic"], variable: "--f-body" });

// Runs before the first paint. It marks the page as "motion will run", which lets the stylesheet hold
// the home page's opening state until the motion code (loaded after first paint) takes over. No class
// is added for visitors who prefer reduced motion. If the home page's motion code has not started
// within 2.5 s, the class is removed again, so nothing can stay hidden.
const MOTION_GATE = `(function(){var d=document.documentElement;try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){return}d.classList.add('has-motion');setTimeout(function(){if(!window.__dastaMotion&&document.querySelector('[data-home]'))d.classList.remove('has-motion')},2500)})()`;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDict(asLocale((await params).locale));
  return {
    title: { default: t.brand, template: `%s · ${t.brand}` },
    description: t.tagline,
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const viewer = await getViewer();

  return (
    <html lang={locale} dir={t.dir} className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_GATE }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Header locale={locale} t={t} viewer={viewer} />
        {/* Page-to-page changes cross-fade where the browser supports view transitions. */}
        <ViewTransition>
          <main className="page wrap flex-1 pb-16 lg:pb-24">{children}</main>
        </ViewTransition>
        <Footer locale={locale} t={t} className="site-footer" />
        <TabBar locale={locale} labels={t.nav} dashboard={viewer ? `/${locale}/${viewer.role}` : null} />
      </body>
    </html>
  );
}
