import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import type { Spec } from "@/components/ui";
import { saveProduct } from "@/app/[locale]/actions";

export type EditableProduct = {
  ref: string;
  category_id: number;
  title_en: string;
  title_ar: string;
  part_number: string;
  condition: string;
  specs: Spec[];
  description_en: string;
  description_ar: string;
  price_piastres: number;
  stock: number;
  status: string;
};

type Category = { id: number; name_en: string; name_ar: string };

export function ProductForm({ t, locale, categories, product }: { t: Dict; locale: Locale; categories: Category[]; product?: EditableProduct }) {
  const f = t.productForm;
  const specsText = (product?.specs ?? []).map((s) => `${s.k_en} = ${s.v}`).join("\n");
  return (
    <form action={saveProduct} className="card space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ref" value={product?.ref ?? ""} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-title-en">
            {f.titleEn}
          </label>
          <input id="p-title-en" name="title_en" className="input" dir="ltr" defaultValue={product?.title_en} required minLength={3} maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="p-title-ar">
            {f.titleAr}
          </label>
          <input id="p-title-ar" name="title_ar" className="input" dir="rtl" defaultValue={product?.title_ar} required minLength={3} maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="p-pn">
            {f.partNumber}
          </label>
          <input id="p-pn" name="part_number" className="input code" defaultValue={product?.part_number} required minLength={2} maxLength={40} />
        </div>
        <div>
          <label className="label" htmlFor="p-cat">
            {f.category}
          </label>
          <select id="p-cat" name="category_id" className="input" defaultValue={product?.category_id ?? categories[0]?.id} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c, "name", locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-cond">
            {f.condition}
          </label>
          <select id="p-cond" name="condition" className="input" defaultValue={product?.condition ?? "new"} required>
            {["new", "used", "refurbished"].map((c) => (
              <option key={c} value={c}>
                {t.condition[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-status">
            {f.status}
          </label>
          {product?.status === "flagged" ? (
            <p className="pill pill-held">{f.statusFlagged}</p>
          ) : (
            <select id="p-status" name="status" className="input" defaultValue={product?.status ?? "active"}>
              <option value="active">{f.statusActive}</option>
              <option value="paused">{f.statusPaused}</option>
            </select>
          )}
        </div>
        <div>
          <label className="label" htmlFor="p-price">
            {f.price}
          </label>
          <input id="p-price" name="price" className="input code" inputMode="decimal" pattern="[0-9][0-9,]*(\.[0-9]{1,2})?" defaultValue={product ? String(product.price_piastres / 100) : ""} required />
        </div>
        <div>
          <label className="label" htmlFor="p-stock">
            {f.stock}
          </label>
          <input id="p-stock" name="stock" type="number" min={0} max={100000} className="input code" defaultValue={product?.stock ?? 1} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="p-specs">
          {f.specs}
        </label>
        <textarea id="p-specs" name="specs" rows={4} className="input code" defaultValue={specsText} />
        <p className="mt-1 text-[13px] text-muted">{f.specsHint}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-desc-en">
            {f.descriptionEn}
          </label>
          <textarea id="p-desc-en" name="description_en" rows={4} className="input" dir="ltr" maxLength={2000} defaultValue={product?.description_en} />
        </div>
        <div>
          <label className="label" htmlFor="p-desc-ar">
            {f.descriptionAr}
          </label>
          <textarea id="p-desc-ar" name="description_ar" rows={4} className="input" dir="rtl" maxLength={2000} defaultValue={product?.description_ar} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn">
          {f.save}
        </button>
        <Link href={`/${locale}/seller`} className="btn btn-ghost">
          {f.cancel}
        </Link>
      </div>
    </form>
  );
}
