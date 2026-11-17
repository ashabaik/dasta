import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Mock payment provider, shaped like Paymob's "transaction processed" callback:
 * a server-to-server POST with a JSON body { type: "TRANSACTION", obj: {...} } and the signature in the
 * query string (?hmac=...). The signature is HMAC-SHA512 (hex) over the values of the fields below,
 * concatenated in exactly this order with no separator. The order is the one Paymob documents at
 * developers.paymob.com (HMAC Transaction Callback), so a real Paymob integration could replace the
 * mock by swapping the secret and the checkout step. No real provider is called anywhere: payments run in test mode.
 */
export const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

export type TransactionObj = {
  id: number;
  pending: boolean;
  amount_cents: number;
  success: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_voided: boolean;
  is_refunded: boolean;
  is_3d_secure: boolean;
  integration_id: number;
  has_parent_transaction: boolean;
  order: { id: number; merchant_order_id: string };
  created_at: string;
  currency: string;
  error_occured: boolean;
  owner: number;
  source_data: { pan: string; type: string; sub_type: string };
};

export type TransactionCallback = { type: "TRANSACTION"; obj: TransactionObj };

function valueAt(obj: unknown, path: string): string {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur === undefined || cur === null ? "" : String(cur);
}

/** The exact string that is signed. */
export function hmacString(obj: unknown): string {
  return HMAC_FIELDS.map((f) => valueAt(obj, f)).join("");
}

export function signTransaction(obj: unknown, secret: string): string {
  return createHmac("sha512", secret).update(hmacString(obj)).digest("hex");
}

/** Constant-time comparison, so the check does not leak how many characters matched. */
export function verifyTransaction(obj: unknown, hmac: string | null, secret: string): boolean {
  if (!hmac || !/^[0-9a-f]{128}$/i.test(hmac)) return false;
  const expected = Buffer.from(signTransaction(obj, secret), "hex");
  const given = Buffer.from(hmac.toLowerCase(), "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** What the mock provider sends for one payment attempt on one order. */
export function buildMockTransaction(orderNo: string, amountPiastres: number, success: boolean, txnId: number): TransactionCallback {
  return {
    type: "TRANSACTION",
    obj: {
      id: txnId,
      pending: false,
      amount_cents: amountPiastres,
      success,
      is_auth: false,
      is_capture: false,
      is_standalone_payment: true,
      is_voided: false,
      is_refunded: false,
      is_3d_secure: true,
      integration_id: 1,
      has_parent_transaction: false,
      order: { id: txnId + 1, merchant_order_id: orderNo },
      created_at: new Date().toISOString(),
      currency: "EGP",
      error_occured: !success,
      owner: 1,
      source_data: { pan: "0000", type: "card", sub_type: "MockCard" },
    },
  };
}

/** Checks that a callback body has the fields the handler needs, with the right types. */
export function parseTransaction(body: unknown): TransactionObj | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { type?: unknown; obj?: unknown };
  if (b.type !== "TRANSACTION" || !b.obj || typeof b.obj !== "object") return null;
  const o = b.obj as Partial<TransactionObj>;
  if (!Number.isSafeInteger(o.id) || !Number.isSafeInteger(o.amount_cents) || typeof o.success !== "boolean") return null;
  if (!o.order || typeof o.order.merchant_order_id !== "string" || o.order.merchant_order_id.length > 40) return null;
  return o as TransactionObj;
}
