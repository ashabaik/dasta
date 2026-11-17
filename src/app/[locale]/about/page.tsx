import type { Metadata } from "next";
import Link from "next/link";
import { asLocale, getDict } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getDict(asLocale((await params).locale)).titles.about };
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 ps-5 text-sm">
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
      <h1 className="mt-8 text-2xl font-semibold">{a.title}</h1>
      <p className="mt-2 text-muted">{a.lead}</p>

      <h2 className="h-section">{a.tryTitle}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {a.tryItems.map(([role, what]) => (
          <div key={role} className="card">
            <h3 className="font-semibold">{role}</h3>
            <p className="mt-1 text-sm text-muted">{what}</p>
          </div>
        ))}
      </div>
      <p className="mt-3">
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
      <p className="card text-sm">{a.testsLead}</p>

      <h2 className="h-section">{a.limitsTitle}</h2>
      <div className="card">
        <List items={a.limitsItems} />
      </div>

      <p className="mt-6 text-sm text-muted">{a.builtBy}</p>
    </div>
  );
}
