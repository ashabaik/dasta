import type { Metadata } from "next";
import { Bricolage_Grotesque, Readex_Pro } from "next/font/google";
import "../../mockups.css";
import { MOTION_GATE } from "@/mockups/ab-pages/gate";

// Each language has its own root layout so that it preloads only the fonts it shows:
// English never waits for the Arabic file, and Arabic never loads the Latin display face.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-display" });
const body = Readex_Pro({ subsets: ["latin"], variable: "--f-body" });

export const metadata: Metadata = { title: "Dasta", robots: { index: false, follow: false } };

export default function LayoutEn({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`mk-ab ${display.variable} ${body.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_GATE }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-[16px] leading-relaxed text-foreground">{children}</body>
    </html>
  );
}
