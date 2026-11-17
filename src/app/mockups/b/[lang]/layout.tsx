import type { Metadata } from "next";
import { Bricolage_Grotesque, Readex_Pro } from "next/font/google";
import "../../mockups.css";
import { asLang } from "@/mockups/data";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-display" });
// One family drawn for both scripts, so Arabic and Latin share proportions.
const body = Readex_Pro({ subsets: ["latin", "arabic"], variable: "--f-body" });

export const metadata: Metadata = { title: "Dasta · direction B", robots: { index: false, follow: false } };
export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

export default async function LayoutB({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={`mk-b ${display.variable} ${body.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans text-[16px] leading-relaxed text-foreground">{children}</body>
    </html>
  );
}
