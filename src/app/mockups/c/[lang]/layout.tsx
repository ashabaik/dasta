import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Noto_Kufi_Arabic } from "next/font/google";
import "../../mockups.css";
import { asLang } from "@/mockups/data";

// Archivo ships a width axis, which is what lets the headings run condensed.
const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--f-display" });
const body = IBM_Plex_Sans({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--f-body" });
const arDisplay = Noto_Kufi_Arabic({ subsets: ["arabic"], variable: "--f-ar-display" });
const arBody = IBM_Plex_Sans_Arabic({ weight: ["400", "500", "600"], subsets: ["arabic"], variable: "--f-ar-body" });

export const metadata: Metadata = { title: "Sanf · direction C", robots: { index: false, follow: false } };
export const generateStaticParams = () => [{ lang: "en" }, { lang: "ar" }];

export default async function LayoutC({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={`mk-c ${display.variable} ${body.variable} ${arDisplay.variable} ${arBody.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans text-[16px] leading-relaxed text-foreground">{children}</body>
    </html>
  );
}
