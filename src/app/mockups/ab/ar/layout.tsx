import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import "../../mockups.css";
import { MOTION_GATE } from "@/mockups/ab-pages/gate";

// Each language has its own root layout so that it preloads only the fonts it shows:
// Arabic uses one family, drawn for both scripts, for headings and text.
const body = Readex_Pro({ subsets: ["arabic", "latin"], variable: "--f-body" });

export const metadata: Metadata = { title: "دستة", robots: { index: false, follow: false } };

export default function LayoutAr({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`mk-ab ${body.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_GATE }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-[16px] leading-relaxed text-foreground">{children}</body>
    </html>
  );
}
