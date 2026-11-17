import { redirect } from "next/navigation";
import { asLocale, getDict } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { ProductForm } from "@/components/product-form";

type Search = Record<string, string | string[] | undefined>;

export default async function NewProductPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const viewer = await requireRole(locale, "seller");
  if (!viewer.sellerId) redirect(`/${locale}/seller`);
  const errorKey = String((await searchParams).error ?? "");
  const supabase = await supabaseServer();
  const { data: categories } = await supabase.from("categories").select("id, name_en, name_ar").order("sort");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">{t.productForm.newTitle}</h1>
      {errorKey ? <p className="error mt-4">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}
      <div className="mt-4">
        <ProductForm t={t} locale={locale} categories={categories ?? []} />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: t.titles.listing };
}
