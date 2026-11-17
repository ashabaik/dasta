import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "../mockups.css";

const body = Instrument_Sans({ subsets: ["latin"], variable: "--f-body" });

export const metadata: Metadata = { title: "Three design directions", robots: { index: false, follow: false } };

export default function IndexLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`mk-index ${body.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans text-[16px] leading-relaxed text-foreground">{children}</body>
    </html>
  );
}
