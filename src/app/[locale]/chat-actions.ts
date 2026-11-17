"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/session";
import { asLocale } from "@/lib/i18n";
import { checkText } from "@/lib/contact-filter";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function errorKey(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("chat_suspended")) return "chatSuspended";
  if (m.includes("rate_limited")) return "rateLimited";
  if (m.includes("not_available")) return "notAvailable";
  if (m.includes("not_found")) return "notFound";
  if (m.includes("not_allowed") || m.includes("permission denied")) return "notAllowed";
  if (m.includes("invalid_input")) return "invalid";
  return "generic";
}

export async function openThread(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const ref = str(formData, "ref");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("chat_open_thread", { p_product_ref: ref });
  if (error || !data) redirect(`/${locale}/p/${encodeURIComponent(ref)}?error=${errorKey(error?.message)}`);
  redirect(`/${locale}/messages/${data}`);
}

/**
 * Sending a message:
 *  1. the visitor's own session must be able to see the thread (row level security)
 *  2. the contact filter runs here, on the server, with the sender's recent messages for context
 *  3. the message is stored through a database function that only the server may call; the database
 *     runs its own second check and decides delivered / held / blocked
 * A browser cannot skip step 2: users have no INSERT right on the messages table.
 */
export async function sendMessage(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const threadId = str(formData, "thread_id");
  const body = str(formData, "body").slice(0, 1000);
  const back = `/${locale}/messages/${encodeURIComponent(threadId)}`;
  if (!body) redirect(back);

  const supabase = await supabaseServer();
  const [viewer, userResult] = await Promise.all([getViewer(), supabase.auth.getUser()]);
  const user = userResult.data.user;
  if (!viewer || !user) redirect(`/${locale}/signin`);
  if (viewer.role === "admin") redirect(`${back}?error=notAllowed`);

  const { data: thread } = await supabase.from("threads").select("id").eq("id", threadId).maybeSingle();
  if (!thread) redirect(`/${locale}/messages?error=notFound`);

  const { data: recent } = await supabase
    .from("messages")
    .select("body")
    .eq("thread_id", thread.id)
    .eq("sender", viewer.role)
    .order("id", { ascending: false })
    .limit(6);
  const previous = (recent ?? []).map((m) => m.body).reverse();
  const verdict = checkText(body, previous);

  const { data, error } = await supabaseAdmin().rpc("chat_post_message", {
    p_thread_id: thread.id,
    p_user_id: user.id,
    p_body: body,
    p_verdict: verdict.verdict,
    p_reasons: verdict.reasons,
  });
  revalidatePath(back);
  if (error) redirect(`${back}?error=${errorKey(error.message)}`);
  const status = (data as { status: string }).status;
  redirect(status === "delivered" ? back : `${back}?notice=${status === "blocked" ? "blocked" : "held"}`);
}

export async function moderate(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("admin_moderate", {
    p_message_id: Number.parseInt(str(formData, "message_id"), 10) || 0,
    p_decision: str(formData, "decision"),
  });
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/admin/moderation${error ? `?error=${errorKey(error.message)}` : ""}`);
}

export async function clearStrikes(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("admin_clear_strikes", { p_code: str(formData, "code") });
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/admin/moderation${error ? `?error=${errorKey(error.message)}` : ""}`);
}

/** The admin makes a flagged listing visible. Row level security allows this update for admins only. */
export async function approveListing(formData: FormData) {
  const locale = asLocale(str(formData, "locale"));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("products").update({ status: "active" }).eq("ref", str(formData, "ref")).eq("status", "flagged").select("ref");
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/admin/moderation${error || !data?.length ? "?error=notAllowed" : ""}`);
}
