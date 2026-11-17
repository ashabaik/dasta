import { NextResponse } from "next/server";
import { parseTransaction, verifyTransaction } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/server";

// Payment provider -> platform. Server to server, no session.
// 1. the signature is checked against the raw fields of the body (HMAC-SHA512, constant-time compare)
// 2. only then the event is handed to the database, which applies it at most once per event id
export async function POST(request: Request) {
  const secret = process.env.PAYMENT_HMAC_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const raw = await request.text();
  if (raw.length > 20_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const obj = parseTransaction(body);
  if (!obj) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const hmac = new URL(request.url).searchParams.get("hmac");
  if (!verifyTransaction(obj, hmac, secret)) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  const { data, error } = await supabaseAdmin().rpc("payment_apply_event", {
    p_provider: "mock",
    p_event_id: String(obj.id),
    p_merchant_order_id: obj.order.merchant_order_id,
    p_success: obj.success === true && obj.pending !== true,
    p_amount_piastres: obj.amount_cents,
    p_payload: body,
  });
  // A 5xx tells the provider to deliver the event again later; the database makes that safe.
  if (error) return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  return NextResponse.json({ result: data });
}
