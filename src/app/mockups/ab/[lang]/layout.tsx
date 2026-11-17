import type { Metadata } from "next";
import { Bricolage_Grotesque, Readex_Pro } from "next/font/google";
import "../../mockups.css";
import { asLang } from "@/mockups/data";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-display" });
// One family drawn for both scripts, so Arabic and Latin share proportions.
const body = Readex_Pro({ subsets: ["latin", "arabic"], variable: "--f-body" });

export const metadata: Metadata = { title: "Dasta", robots: { index: false, follow: false } };
export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

// Runs before the first paint. It marks the page as "motion will run", which lets the stylesheet
// hold the home page's opening state until the motion code (loaded after first paint) takes over.
// No class is added for visitors who prefer reduced motion, and if the motion code has not started
// within 2.5 s the class is removed again, so nothing can stay hidden.
const MOTION_GATE = `(function(){var d=document.documentElement;try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){return}d.classList.add('has-motion');setTimeout(function(){if(!window.__dastaMotion)d.classList.remove('has-motion')},2500)})()`;

export default async function LayoutAB({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={`mk-ab ${display.variable} ${body.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_GATE }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-[16px] leading-relaxed text-foreground">{children}</body>
    </html>
  );
}
