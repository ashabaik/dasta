import { describe, expect, it } from "vitest";
import { buildMockTransaction, hmacString, parseTransaction, signTransaction, verifyTransaction } from "@/lib/payments";

const SECRET = "unit-test-secret";

describe("payment callback signature", () => {
  it("builds the signed string in the documented field order", () => {
    // Field values taken from the example in Paymob's public documentation of this callback.
    const obj = {
      amount_cents: 100000,
      created_at: "2024-06-13T11:33:44.592345",
      currency: "EGP",
      error_occured: false,
      has_parent_transaction: false,
      id: 192036465,
      integration_id: 4097558,
      is_3d_secure: true,
      is_auth: false,
      is_capture: false,
      is_refunded: false,
      is_standalone_payment: true,
      is_voided: false,
      order: { id: 217503754 },
      owner: 302852,
      pending: false,
      source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
      success: true,
    };
    expect(hmacString(obj)).toBe(
      "1000002024-06-13T11:33:44.592345EGPfalsefalse1920364654097558truefalsefalsefalsetruefalse217503754302852false2346MasterCardcardtrue",
    );
  });

  it("accepts a callback signed with the right secret", () => {
    const cb = buildMockTransaction("DS-ABC234", 840000, true, 5001);
    expect(verifyTransaction(cb.obj, signTransaction(cb.obj, SECRET), SECRET)).toBe(true);
  });

  it("rejects a wrong secret, a missing signature and a malformed one", () => {
    const cb = buildMockTransaction("DS-ABC234", 840000, true, 5001);
    expect(verifyTransaction(cb.obj, signTransaction(cb.obj, "other-secret"), SECRET)).toBe(false);
    expect(verifyTransaction(cb.obj, null, SECRET)).toBe(false);
    expect(verifyTransaction(cb.obj, "abc", SECRET)).toBe(false);
    expect(verifyTransaction(cb.obj, "z".repeat(128), SECRET)).toBe(false);
  });

  it("rejects a body that was changed after signing", () => {
    const cb = buildMockTransaction("DS-ABC234", 840000, false, 5001);
    const hmac = signTransaction(cb.obj, SECRET);
    expect(verifyTransaction({ ...cb.obj, success: true, error_occured: false }, hmac, SECRET)).toBe(false);
    expect(verifyTransaction({ ...cb.obj, amount_cents: 1 }, hmac, SECRET)).toBe(false);
  });

  it("refuses bodies that do not look like a transaction", () => {
    expect(parseTransaction(null)).toBeNull();
    expect(parseTransaction({ type: "TOKEN", obj: {} })).toBeNull();
    expect(parseTransaction({ type: "TRANSACTION", obj: { id: "1", amount_cents: 5, success: true, order: { merchant_order_id: "x" } } })).toBeNull();
    expect(parseTransaction({ type: "TRANSACTION", obj: { id: 1, amount_cents: 5, success: "yes", order: { merchant_order_id: "x" } } })).toBeNull();
    expect(parseTransaction(buildMockTransaction("DS-ABC234", 100, true, 7))?.order.merchant_order_id).toBe("DS-ABC234");
  });
});
