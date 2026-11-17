"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/session";
import { asLocale } from "@/lib/i18n";
import { parseEgpToPiastres } from "@/lib/format";
import { MAX_PHOTOS_PER_PRODUCT, MAX_PHOTO_BYTES, reencodePhoto } from "@/lib/photo";

// Every action below is a public endpoint. Each one either goes through the visitor's own database
// session (row level security decides) or checks ownership first before using the privileged client.

const DEMO_DOMAIN = "makbas.example";
const DEMO_ACCOUNTS: Record<string, string> = { buyer: "buyer1", seller: "seller1", admin: "admin" };
const MAX_THROWAWAY_SELLERS = 300;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Maps a database error to a message key. Raw database messages are never shown to visitors. */
function errorKey(message: string | undefined): string {
  if (!message) return "generic";
  if (message.includes("product_limit_reached")) return "limit";
  if (message.includes("reason_required")) return "reasonRequired";
  if (message.includes("not_allowed") || message.includes("permission denied") || message.includes("row-level security")) return "notAllowed";
  if (message.includes("invalid_input") || message.includes("violates check constraint") || message.includes("invalid input")) return "invalid";
  return "generic";
}

export async function demoSignIn(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const role = str(formData, "role");
  const supabase = await supabaseServer();

  if (role === "new-seller") {
    const admin = supabaseAdmin();
    const { count } = await admin.from("sellers").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_THROWAWAY_SELLERS) redirect(`/${locale}/signin?error=busy`);
    const email = `new-seller-${randomBytes(6).toString("hex")}@${DEMO_DOMAIN}`;
    const password = randomBytes(24).toString("base64url");
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "seller" } });
    if (created.error) redirect(`/${locale}/signin?error=failed`);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect(`/${locale}/signin?error=failed`);
    redirect(`/${locale}/seller`);
  }

  const account = DEMO_ACCOUNTS[role];
  if (!account) redirect(`/${locale}/signin?error=failed`);
  const { error } = await supabase.auth.signInWithPassword({ email: `${account}@${DEMO_DOMAIN}`, password: process.env.DEMO_USER_PASSWORD! });
  if (error) redirect(`/${locale}/signin?error=failed`);
  redirect(`/${locale}/${role}`);
}

export async function signOut(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

export async function sellerOnboard(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("seller_onboard", {
    p_region: str(formData, "region"),
    p_legal_name: str(formData, "legal_name"),
    p_contact_name: str(formData, "contact_name"),
    p_phone: str(formData, "phone"),
    p_email: str(formData, "email"),
    p_address: str(formData, "address"),
    p_tax_id: str(formData, "tax_id"),
    p_bank_name: str(formData, "bank_name"),
    p_iban: str(formData, "iban"),
  });
  if (error) redirect(`/${locale}/seller?error=${errorKey(error.message)}`);
  redirect(`/${locale}/seller`);
}

function parseSpecs(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split("="))
    .filter((parts) => parts.length >= 2 && parts[0].trim() && parts.slice(1).join("=").trim())
    .slice(0, 12)
    .map((parts) => {
      const name = parts[0].trim().slice(0, 40);
      return { k_en: name, k_ar: name, v: parts.slice(1).join("=").trim().slice(0, 60) };
    });
}

export async function saveProduct(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const ref = str(formData, "ref");
  const back = ref ? `/${locale}/seller/products/${ref}` : `/${locale}/seller/products/new`;
  const viewer = await getViewer();
  if (!viewer?.sellerId) redirect(`/${locale}/signin`);

  const price = parseEgpToPiastres(str(formData, "price"));
  const stock = Number.parseInt(str(formData, "stock"), 10);
  const categoryId = Number.parseInt(str(formData, "category_id"), 10);
  if (price === null || !Number.isInteger(stock) || !Number.isInteger(categoryId)) redirect(`${back}?error=invalid`);

  const row = {
    category_id: categoryId,
    title_en: str(formData, "title_en"),
    title_ar: str(formData, "title_ar"),
    part_number: str(formData, "part_number"),
    condition: str(formData, "condition"),
    price_piastres: price,
    stock,
    status: str(formData, "status") === "paused" ? "paused" : "active",
    description_en: str(formData, "description_en"),
    description_ar: str(formData, "description_ar"),
    specs: parseSpecs(String(formData.get("specs") ?? "")),
  };

  const supabase = await supabaseServer();
  if (ref) {
    const { data, error } = await supabase.from("products").update(row).eq("ref", ref).select("ref");
    if (error) redirect(`${back}?error=${errorKey(error.message)}`);
    if (!data?.length) redirect(`${back}?error=notAllowed`);
    revalidatePath(`/${locale}`, "layout");
    redirect(`${back}?saved=1`);
  }
  const { data, error } = await supabase
    .from("products")
    .insert({ ...row, seller_id: viewer.sellerId })
    .select("ref")
    .single();
  if (error || !data) redirect(`${back}?error=${errorKey(error?.message)}`);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/seller/products/${data.ref}?saved=1`);
}

/** Returns the product if (and only if) the visitor's own session can see it as its seller. */
async function ownProduct(ref: string) {
  const viewer = await getViewer();
  if (!viewer?.sellerId) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("products")
    .select("id, ref, seller_id, product_images(id, path)")
    .eq("ref", ref)
    .eq("seller_id", viewer.sellerId)
    .maybeSingle();
  return data;
}

export async function deleteProduct(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const product = await ownProduct(str(formData, "ref"));
  if (!product) redirect(`/${locale}/seller?error=notAllowed`);
  const supabase = await supabaseServer();
  const { error } = await supabase.from("products").delete().eq("id", product.id);
  if (error) redirect(`/${locale}/seller?error=${errorKey(error.message)}`);
  const paths = product.product_images.map((i) => i.path);
  if (paths.length) await supabaseAdmin().storage.from("product-images").remove(paths);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/seller`);
}

export async function uploadPhoto(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const ref = str(formData, "ref");
  const back = `/${locale}/seller/products/${ref}`;
  const product = await ownProduct(ref);
  if (!product) redirect(`/${locale}/seller?error=notAllowed`);

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_BYTES) redirect(`${back}?error=photo`);
  if (product.product_images.length >= MAX_PHOTOS_PER_PRODUCT) redirect(`${back}?error=photo`);

  let clean;
  try {
    clean = await reencodePhoto(Buffer.from(await file.arrayBuffer()));
  } catch {
    redirect(`${back}?error=photo`);
  }

  const admin = supabaseAdmin();
  const path = `${randomUUID()}.webp`; // random name: nothing of the original file name survives
  const up = await admin.storage.from("product-images").upload(path, clean.data, { contentType: "image/webp", cacheControl: "31536000" });
  if (up.error) redirect(`${back}?error=photo`);
  const ins = await admin.from("product_images").insert({ product_id: product.id, path, width: clean.width, height: clean.height, sort: product.product_images.length });
  if (ins.error) {
    await admin.storage.from("product-images").remove([path]);
    redirect(`${back}?error=photo`);
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`${back}?saved=1`);
}

export async function removePhoto(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const ref = str(formData, "ref");
  const back = `/${locale}/seller/products/${ref}`;
  const product = await ownProduct(ref);
  const image = product?.product_images.find((i) => i.id === str(formData, "image_id"));
  if (!product || !image) redirect(`/${locale}/seller?error=notAllowed`);
  const admin = supabaseAdmin();
  await admin.from("product_images").delete().eq("id", image.id);
  await admin.storage.from("product-images").remove([image.path]);
  revalidatePath(`/${locale}`, "layout");
  redirect(back);
}

export async function adminSetSellerStatus(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const supabase = await supabaseServer();
  const verified = str(formData, "verified");
  const { error } = await supabase.rpc("admin_set_seller_status", {
    p_seller_id: str(formData, "seller_id"),
    p_status: str(formData, "status"),
    p_verified: verified === "" ? null : verified === "true",
  });
  if (error) redirect(`/${locale}/admin?error=${errorKey(error.message)}`);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/admin`);
}

export type RevealState = {
  error?: string;
  identity?: {
    seller_code: string;
    legal_name: string;
    contact_name: string;
    phone: string;
    email: string;
    address: string;
    tax_id: string;
    bank_name: string;
    iban: string;
  };
};

/** The database writes the audit row before it returns the identity (see admin_reveal_seller_identity). */
export async function adminReveal(_prev: RevealState, formData: FormData): Promise<RevealState> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("admin_reveal_seller_identity", {
    p_seller_id: str(formData, "seller_id"),
    p_reason: str(formData, "reason"),
  });
  if (error) return { error: errorKey(error.message) };
  if (!data?.length) return { error: "notFound" };
  revalidatePath(`/${asLocale(str(formData, "locale"))}/admin`);
  return { identity: data[0] };
}
