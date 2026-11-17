"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { asLocale } from "@/lib/i18n";
import { buildMockTransaction, signTransaction } from "@/lib/payments";

// Order actions. Each one calls a database function with the visitor's own session; the function
// decides whether this visitor may take this step for this order. Nothing here trusts form values
// for anything except "which order" and "which step".

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function errorKey(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("invalid_transition")) return "invalidTransition";
  if (m.includes("below_minimum")) return "belowMinimum";
  if (m.includes("insufficient_stock")) return "stock";
  if (m.includes("too_many_pending")) return "tooManyPending";
  if (m.includes("not_available")) return "notAvailable";
  if (m.includes("nothing_to_pay")) return "nothingToPay";
  if (m.includes("already_rated")) return "alreadyRated";
  if (m.includes("not_found")) return "notFound";
  if (m.includes("not_allowed") || m.includes("permission denied")) return "notAllowed";
  if (m.includes("invalid_input") || m.includes("invalid input")) return "invalid";
  return "generic";
}

export async function createOrder(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const ref = str(formData, "ref");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("buyer_create_order", {
    p_product_ref: ref,
    p_quantity: Number.parseInt(str(formData, "quantity"), 10) || 0,
  });
  if (error || !data) redirect(`/${locale}/p/${encodeURIComponent(ref)}?error=${errorKey(error?.message)}`);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/pay/${data}`);
}

/**
 * The mock payment provider. It does what a real provider does after the buyer pays: it sends a signed
 * callback to the platform's webhook, server to server, and then returns the buyer to the order.
 */
export async function mockPay(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const no = str(formData, "no");
  const success = str(formData, "outcome") === "success";
  const supabase = await supabaseServer();
  // Row level security: this returns a row only for the buyer of this order.
  const { data: order } = await supabase.from("orders").select("no, total_piastres, status").eq("no", no).maybeSingle();
  if (!order || order.status !== "pending_payment") redirect(`/${locale}/orders/${encodeURIComponent(no)}?error=invalidTransition`);

  const callback = buildMockTransaction(order.no, order.total_piastres, success, randomInt(100_000_000, 2_000_000_000));
  const hmac = signTransaction(callback.obj, process.env.PAYMENT_HMAC_SECRET!);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  let delivered = false;
  try {
    const res = await fetch(`${origin}/api/webhooks/payments?hmac=${hmac}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(callback),
      cache: "no-store",
    });
    delivered = res.ok;
  } catch {
    delivered = false;
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/orders/${order.no}${delivered ? "" : "?error=payment"}`);
}

export async function orderStep(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const no = str(formData, "no");
  const step = str(formData, "step");
  const supabase = await supabaseServer();
  let error: { message: string } | null = null;

  if (step === "cancel") ({ error } = await supabase.rpc("buyer_cancel_order", { p_no: no }));
  else if (step === "confirm") ({ error } = await supabase.rpc("buyer_confirm_delivery", { p_no: no }));
  else if (step === "ship") ({ error } = await supabase.rpc("seller_mark_shipped", { p_no: no }));
  else if (step === "dispute")
    ({ error } = await supabase.rpc("buyer_open_dispute", { p_no: no, p_reason_code: str(formData, "reason"), p_note: str(formData, "note").slice(0, 1000) }));
  else if (step === "resolve-release" || step === "resolve-refund")
    ({ error } = await supabase.rpc("admin_resolve_dispute", {
      p_no: no,
      p_outcome: step === "resolve-release" ? "release" : "refund",
      p_note: str(formData, "note").slice(0, 1000),
    }));
  else error = { message: "invalid_input" };

  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/orders/${encodeURIComponent(no)}${error ? `?error=${errorKey(error.message)}` : ""}`);
}

export async function payoutSeller(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("admin_payout_seller", { p_seller_id: str(formData, "seller_id") });
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/admin/money${error ? `?error=${errorKey(error.message)}` : ""}`);
}

export async function setCommission(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const pct = Number(str(formData, "percent").replace(",", "."));
  const supabase = await supabaseServer();
  const { error } = Number.isFinite(pct)
    ? await supabase.rpc("admin_set_commission", { p_bps: Math.round(pct * 100) })
    : { error: { message: "invalid_input" } };
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/admin/money${error ? `?error=${errorKey(error.message)}` : ""}`);
}

export async function rateOrder(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const no = str(formData, "no");
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("buyer_rate_order", { p_no: no, p_stars: Number.parseInt(str(formData, "stars"), 10) || 0 });
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/orders/${encodeURIComponent(no)}?${error ? `error=${errorKey(error.message)}` : "rated=1"}`);
}
