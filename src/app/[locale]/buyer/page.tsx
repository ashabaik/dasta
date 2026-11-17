import Link from "next/link";
import { asLocale, getDict } from "@/lib/i18n";
import { requireRole } from "@/lib/session";

export default async function BuyerDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const viewer = await requireRole(locale, "buyer");
  const d = t.buyerDash;

  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold">{d.title}</h1>
      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold">{d.yourCode}</h2>
          <p className="code text-2xl font-semibold">{viewer.buyerCode}</p>
          <p className="text-[13px] text-muted">{d.codeHint}</p>
        </div>
        <div className="card space-y-3">
          <p className="text-muted">{d.noOrders}</p>
          <Link href={`/${locale}`} className="btn self-start">
            {d.browse}
          </Link>
        </div>
      </div>
    </>
  );
}
