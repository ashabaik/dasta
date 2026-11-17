import type { Metadata } from "next";
import Link from "next/link";
import { asLocale, getDict } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getDict(asLocale((await params).locale)).titles.about };
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 ps-5 text-[15px]">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const a = t.about;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">{a.title}</h1>
      <p className="mt-3 text-[18px] text-muted-foreground">{a.lead}</p>

      {/* Said first and plainly: what here is sample data and what runs in test mode. */}
      <h2 className="h-section">{a.sampleTitle}</h2>
      <div className="rounded-[22px] bg-accent p-5 sm:p-6">
        <List items={a.sampleItems} />
      </div>
      <p className="mt-4">
        <Link href={`/${locale}/signin`} className="btn">
          {a.signIn}
        </Link>
      </p>

      <h2 className="h-section">{a.howTitle}</h2>
      <div className="card">
        <List items={a.howItems} />
      </div>

      <h2 className="h-section">{a.moneyTitle}</h2>
      <div className="card">
        <List items={a.moneyItems} />
      </div>

      <h2 className="h-section">{a.testsTitle}</h2>
      <p className="card text-[15px]">{a.testsLead}</p>

      <h2 className="h-section">{a.limitsTitle}</h2>
      <div className="card">
        <List items={a.limitsItems} />
      </div>

      <p className="mt-8 text-[15px] text-muted-foreground">
        <a href="https://ashabaik.github.io" className="underline underline-offset-4">
          {a.builtBy}
        </a>
      </p>
    </div>
  );
}
