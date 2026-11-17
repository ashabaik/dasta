import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, Markazi_Text, Noto_Sans_Arabic } from "next/font/google";
import "../../mockups.css";
import { asLang } from "@/mockups/data";

const display = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--f-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--f-body" });
const arDisplay = Markazi_Text({ subsets: ["arabic"], variable: "--f-ar-display" });
const arBody = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--f-ar-body" });

export const metadata: Metadata = { title: "Raff · direction A", robots: { index: false, follow: false } };
export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

export default async function LayoutA({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={`mk-a ${display.variable} ${body.variable} ${arDisplay.variable} ${arBody.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans text-[16px] leading-relaxed text-foreground">{children}</body>
    </html>
  );
}
