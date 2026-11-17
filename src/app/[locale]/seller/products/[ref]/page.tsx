import { notFound, redirect } from "next/navigation";
import { asLocale, getDict } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { MAX_PHOTOS_PER_PRODUCT } from "@/lib/photo";
import { ProductForm, type EditableProduct } from "@/components/product-form";
import { imageUrl } from "@/components/ui";
import { deleteProduct, removePhoto, uploadPhoto } from "../../../actions";

type Search = Record<string, string | string[] | undefined>;

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ locale: string; ref: string }>; searchParams: Promise<Search> }) {
  const p0 = await params;
  const locale = asLocale(p0.locale);
  const t = getDict(locale);
  const f = t.productForm;
  const viewer = await requireRole(locale, "seller");
  if (!viewer.sellerId) redirect(`/${locale}/seller`);
  const sp = await searchParams;
  const errorKey = String(sp.error ?? "");
  const supabase = await supabaseServer();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("ref, category_id, title_en, title_ar, part_number, condition, specs, description_en, description_ar, price_piastres, stock, status, product_images(id, path, sort)")
      .eq("ref", p0.ref)
      .eq("seller_id", viewer.sellerId)
      .maybeSingle(),
    supabase.from("categories").select("id, name_en, name_ar").order("sort"),
  ]);
  if (!product) notFound();
  const photos = [...product.product_images].sort((a, b) => a.sort - b.sort);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mt-6 text-2xl font-semibold">{f.editTitle}</h1>
      <p className="code mt-1 text-sm text-muted">{product.part_number}</p>
      {sp.saved ? <p className="pill pill-ok mt-4">{f.saved}</p> : null}
      {errorKey ? <p className="error mt-4">{(t.errors as Record<string, string>)[errorKey] ?? t.errors.generic}</p> : null}

      <div className="mt-4">
        <ProductForm t={t} locale={locale} categories={categories ?? []} product={product as unknown as EditableProduct} />
      </div>

      <section className="card mt-4 space-y-3">
        <h2 className="text-sm font-semibold">{f.photos}</h2>
        <p className="text-[13px] text-muted">{f.photosLead}</p>
        {photos.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((ph) => (
              <li key={ph.id} className="space-y-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(ph.path)} alt="" className="aspect-square w-full rounded border border-line object-cover" />
                <form action={removePhoto}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="ref" value={product.ref} />
                  <input type="hidden" name="image_id" value={ph.id} />
                  <button type="submit" className="btn btn-ghost btn-sm w-full">
                    {f.removePhoto}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        {photos.length < MAX_PHOTOS_PER_PRODUCT ? (
          <form action={uploadPhoto} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="ref" value={product.ref} />
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className="input max-w-xs" aria-label={f.upload} />
            <button type="submit" className="btn btn-ghost">
              {f.upload}
            </button>
          </form>
        ) : null}
        <p className="text-[13px] text-muted">{f.photoLimit}</p>
      </section>

      <form action={deleteProduct} className="mt-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="ref" value={product.ref} />
        <button type="submit" className="btn btn-danger">
          {f.delete}
        </button>
      </form>
    </div>
  );
}
