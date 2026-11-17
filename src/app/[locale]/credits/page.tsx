import Link from "next/link";
import { asLocale, getDict, pick } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/components/ui";

type Row = {
  path: string;
  kind: string;
  credit_title: string | null;
  credit_author: string | null;
  credit_license: string | null;
  credit_license_url: string | null;
  credit_source_url: string | null;
  products: { ref: string; title_en: string; title_ar: string; part_number: string };
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return { title: getDict(asLocale((await params).locale)).media.creditsTitle };
}

// Attribution for the third-party photos used on sample listings.
export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const m = t.media;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("product_images")
    .select("path, kind, credit_title, credit_author, credit_license, credit_license_url, credit_source_url, products!inner(ref, title_en, title_ar, part_number)")
    .in("kind", ["photo", "drawing"])
    .order("kind");
  const rows = (data ?? []) as unknown as Row[];
  const photos = rows.filter((r) => r.kind === "photo").sort((a, b) => a.products.part_number.localeCompare(b.products.part_number));
  const drawings = rows.filter((r) => r.kind === "drawing").length;

  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold">{m.creditsTitle}</h1>
      <p className="mt-2 max-w-3xl text-muted">{m.creditsLead}</p>
      <div className="card mt-4 overflow-x-auto p-0">
        <table className="table" data-testid="credits">
          <thead>
            <tr>
              <th>{m.image}</th>
              <th>{m.listing}</th>
              <th>{m.author}</th>
              <th>{m.licence}</th>
              <th>{m.source}</th>
            </tr>
          </thead>
          <tbody>
            {photos.map((r) => (
              <tr key={r.path}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(r.path)} alt="" className="h-14 w-20 rounded border border-line object-cover" loading="lazy" />
                </td>
                <td className="min-w-44">
                  <Link href={`/${locale}/p/${r.products.ref}`} className="text-steel">
                    {pick(r.products, "title", locale)}
                  </Link>
                  <span className="code block text-xs text-muted">{r.products.part_number}</span>
                </td>
                <td>{r.credit_author}</td>
                <td className="whitespace-nowrap">
                  <a href={r.credit_license_url ?? r.credit_source_url ?? "#"} className="code text-steel" rel="noreferrer license">
                    {r.credit_license}
                  </a>
                </td>
                <td>
                  <a href={r.credit_source_url ?? "#"} className="text-steel" rel="noreferrer" dir="ltr">
                    {r.credit_title}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {drawings ? <p className="mt-3 text-sm text-muted">{m.drawingsNote(drawings)}</p> : null}
    </>
  );
}
