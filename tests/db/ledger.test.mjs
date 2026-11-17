// Orders, escrow and the ledger, tested against the real database.
// "Money in equals money out plus commission" is checked after every scenario.
import { describe, it, expect, beforeAll } from "vitest";
import { anon, as, service, sql } from "./helpers.mjs";

let buyer1, buyer2, seller2, seller3, admin, svc;
let eventSeq = Date.now();

const refOf = async (pn) => (await sql("select ref from public.products where part_number = $1", [pn]))[0].ref;
const stockOf = async (pn) => (await sql("select stock from public.products where part_number = $1", [pn]))[0].stock;
const orderRow = async (no) => (await sql("select * from public.orders where no = $1", [no]))[0];
const overview = async () => (await admin.rpc("admin_ledger_overview")).data;

async function createOrder(client, pn, qty) {
  const { data, error } = await client.rpc("buyer_create_order", { p_product_ref: await refOf(pn), p_quantity: qty });
  if (error) throw new Error(error.message);
  return data;
}

/** What the webhook route does after it has verified the signature. */
function webhook(no, amount, success = true, eventId = `t-${++eventSeq}`) {
  return svc.rpc("payment_apply_event", {
    p_provider: "mock",
    p_event_id: eventId,
    p_merchant_order_id: no,
    p_success: success,
    p_amount_piastres: amount,
    p_payload: { type: "TRANSACTION", obj: { id: eventId, order: { merchant_order_id: no } } },
  });
}

async function expectBalanced() {
  const o = await overview();
  expect(o.entries_sum).toBe(0);
  expect(o.captured).toBe(o.refunded + o.paid_out + o.commission + o.escrow_held + o.seller_payable);
  expect(o.balanced).toBe(true);
  const unbalanced = await sql("select txn_id from private.ledger_entries group by txn_id having sum(amount_piastres) <> 0");
  expect(unbalanced).toEqual([]);
  return o;
}

beforeAll(async () => {
  [buyer1, buyer2, seller2, seller3, admin] = await Promise.all([as("buyer1"), as("buyer2"), as("seller2"), as("seller3"), as("admin")]);
  svc = service();
});

describe("the seeded sample orders", () => {
  it("leave the ledger balanced", async () => {
    const o = await expectBalanced();
    expect(o.captured).toBeGreaterThan(0);
    expect(o.entries).toBeGreaterThan(10);
  });
});

describe("an order from payment to payout", () => {
  let no;
  let before;
  const total = 52000 * 3; // tapered roller bearing, 520 EGP x 3
  const commission = Math.round(total * 0.08);
  const net = total - commission;

  it("creating an order reserves stock and waits for payment", async () => {
    before = await overview();
    const stock = await stockOf("MB-TR-30210");
    no = await createOrder(buyer1, "MB-TR-30210", 3);
    expect(no).toMatch(/^DS-[2-9A-Z]{6}$/);
    const o = await orderRow(no);
    expect(o).toMatchObject({ status: "pending_payment", quantity: 3, commission_bps: 800 });
    expect(Number(o.total_piastres)).toBe(total);
    expect(Number(o.commission_piastres)).toBe(commission);
    expect(Number(o.seller_net_piastres)).toBe(net);
    expect(await stockOf("MB-TR-30210")).toBe(stock - 3);
  });

  it("the seller does not see an order that is not paid", async () => {
    const { data } = await seller3.from("orders").select("no").eq("no", no);
    expect(data).toEqual([]);
  });

  it("a payment event with the wrong amount changes nothing", async () => {
    const r = await webhook(no, total - 1);
    expect(r.data).toBe("amount_mismatch");
    expect((await orderRow(no)).status).toBe("pending_payment");
  });

  it("a failed payment leaves the order open for another try", async () => {
    const r = await webhook(no, total, false);
    expect(r.data).toBe("failed");
    expect((await orderRow(no)).status).toBe("pending_payment");
  });

  it("a successful payment is captured into escrow", async () => {
    const r = await webhook(no, total, true, "t-happy-1");
    expect(r.data).toBe("captured");
    expect((await orderRow(no)).status).toBe("paid_held");
    const o = await expectBalanced();
    expect(o.captured - before.captured).toBe(total);
    expect(o.escrow_held - before.escrow_held).toBe(total);
    expect(o.seller_payable).toBe(before.seller_payable);
  });

  it("the same event delivered again is ignored", async () => {
    expect((await webhook(no, total, true, "t-happy-1")).data).toBe("duplicate");
    expect((await webhook(no, total, true, "t-happy-2")).data).toBe("ignored_state");
    const captures = await sql("select count(*)::int n from private.ledger_txns t join public.orders o on o.id = t.order_id where o.no = $1 and t.kind = 'capture'", [no]);
    expect(captures[0].n).toBe(1);
  });

  it("the buyer cannot confirm delivery before the order is shipped", async () => {
    const { error } = await buyer1.rpc("buyer_confirm_delivery", { p_no: no });
    expect(error?.message).toContain("invalid_transition");
  });

  it("only the order's seller can ship it, and the waybill carries a platform number", async () => {
    expect((await seller2.rpc("seller_mark_shipped", { p_no: no })).error).not.toBeNull();
    const { data, error } = await seller3.rpc("seller_mark_shipped", { p_no: no });
    expect(error).toBeNull();
    expect(data).toMatch(/^DSW-[2-9A-Z]{8}$/);
    expect((await orderRow(no)).status).toBe("shipped");
  });

  it("another buyer cannot confirm or cancel someone else's order", async () => {
    expect((await buyer2.rpc("buyer_confirm_delivery", { p_no: no })).error).not.toBeNull();
    expect((await buyer2.rpc("buyer_cancel_order", { p_no: no })).error).not.toBeNull();
    expect((await orderRow(no)).status).toBe("shipped");
  });

  it("confirming delivery releases the money: seller gets the net, the platform its commission", async () => {
    const payableBefore = (await seller3.rpc("seller_finance")).data[0].payable_piastres;
    const { error } = await buyer1.rpc("buyer_confirm_delivery", { p_no: no });
    expect(error).toBeNull();
    expect((await orderRow(no)).status).toBe("completed");
    const fin = (await seller3.rpc("seller_finance")).data[0];
    expect(fin.payable_piastres - payableBefore).toBe(net);
    const o = await expectBalanced();
    expect(o.commission - before.commission).toBe(commission);
    expect(o.escrow_held).toBe(before.escrow_held);
  });

  it("delivery cannot be confirmed twice", async () => {
    expect((await buyer1.rpc("buyer_confirm_delivery", { p_no: no })).error?.message).toContain("invalid_transition");
    const releases = await sql("select count(*)::int n from private.ledger_txns t join public.orders o on o.id = t.order_id where o.no = $1 and t.kind = 'release'", [no]);
    expect(releases[0].n).toBe(1);
  });

  it("the payout empties what is owed to the seller: money in = money out + commission", async () => {
    const sellerId = (await orderRow(no)).seller_id;
    const owed = (await seller3.rpc("seller_finance")).data[0].payable_piastres;
    const { data, error } = await admin.rpc("admin_payout_seller", { p_seller_id: sellerId });
    expect(error).toBeNull();
    expect(data).toBe(owed);
    expect((await seller3.rpc("seller_finance")).data[0].payable_piastres).toBe(0);
    expect((await admin.rpc("admin_payout_seller", { p_seller_id: sellerId })).error?.message).toContain("nothing_to_pay");
    const o = await expectBalanced();
    // For this order alone: captured = paid out to the seller + commission.
    expect(o.captured - before.captured).toBe(o.paid_out - before.paid_out - (owed - net) + (o.commission - before.commission));
  });

  it("the order history records every step and who did it", async () => {
    const id = (await orderRow(no)).id;
    const events = await sql("select type, actor from public.order_events where order_id = $1 order by id", [id]);
    expect(events.map((e) => `${e.type}:${e.actor}`)).toEqual([
      "created:buyer",
      "payment_failed:provider",
      "paid_held:provider",
      "shipped:seller",
      "delivery_confirmed:buyer",
      "released_to_seller:system",
    ]);
  });
});

describe("cancelling and refunding", () => {
  it("an unpaid order can be cancelled and the stock comes back", async () => {
    const stock = await stockOf("MB-PB-0040");
    const no = await createOrder(buyer1, "MB-PB-0040", 2);
    expect(await stockOf("MB-PB-0040")).toBe(stock - 2);
    expect((await buyer1.rpc("buyer_cancel_order", { p_no: no })).data).toBe("cancelled");
    expect(await stockOf("MB-PB-0040")).toBe(stock);
    expect((await webhook(no, 69000 * 2)).data).toBe("ignored_state");
    await expectBalanced();
  });

  it("a paid order that has not shipped is refunded in full", async () => {
    const before = await overview();
    const stock = await stockOf("MB-PB-0040");
    const no = await createOrder(buyer1, "MB-PB-0040", 1);
    await webhook(no, 69000);
    expect((await buyer1.rpc("buyer_cancel_order", { p_no: no })).data).toBe("refunded");
    expect((await orderRow(no)).status).toBe("refunded");
    expect(await stockOf("MB-PB-0040")).toBe(stock);
    const o = await expectBalanced();
    expect(o.refunded - before.refunded).toBe(69000);
    expect(o.commission).toBe(before.commission);
    expect(o.escrow_held).toBe(before.escrow_held);
  });

  it("a shipped order cannot be cancelled", async () => {
    const no = await createOrder(buyer1, "MB-PB-0040", 1);
    await webhook(no, 69000);
    await seller3.rpc("seller_mark_shipped", { p_no: no });
    expect((await buyer1.rpc("buyer_cancel_order", { p_no: no })).error?.message).toContain("invalid_transition");
  });
});

describe("disputes", () => {
  async function shippedOrder() {
    const no = await createOrder(buyer2, "MT-JC-2838", 1);
    await webhook(no, 87000);
    await seller3.rpc("seller_mark_shipped", { p_no: no });
    return no;
  }

  it("a dispute needs a known reason and freezes the money in escrow", async () => {
    const no = await shippedOrder();
    expect((await buyer2.rpc("buyer_open_dispute", { p_no: no, p_reason_code: "call me on 0100 000 0000", p_note: "" })).error).not.toBeNull();
    const before = await overview();
    const { error } = await buyer2.rpc("buyer_open_dispute", { p_no: no, p_reason_code: "damaged", p_note: "Sample note for the admin." });
    expect(error).toBeNull();
    expect((await orderRow(no)).status).toBe("disputed");
    expect((await overview()).escrow_held).toBe(before.escrow_held);
    expect((await buyer2.rpc("buyer_confirm_delivery", { p_no: no })).error).not.toBeNull();
  });

  it("the buyer's free-text note is for the admin only", async () => {
    const no = await shippedOrder();
    await buyer2.rpc("buyer_open_dispute", { p_no: no, p_reason_code: "wrong_part", p_note: "NOTE-FOR-ADMIN-ONLY" });
    const sellerView = await seller3.from("disputes").select("*, orders!inner(no)").eq("orders.no", no);
    expect(JSON.stringify(sellerView.data)).not.toContain("NOTE-FOR-ADMIN-ONLY");
    expect(sellerView.data[0].reason_code).toBe("wrong_part");
    expect((await seller3.rpc("admin_dispute_notes", { p_no: no })).error).not.toBeNull();
    expect((await admin.rpc("admin_dispute_notes", { p_no: no })).data[0].note).toBe("NOTE-FOR-ADMIN-ONLY");
  });

  it("only the admin resolves a dispute; a refund sends everything back to the buyer", async () => {
    const no = await shippedOrder();
    await buyer2.rpc("buyer_open_dispute", { p_no: no, p_reason_code: "not_received", p_note: "" });
    expect((await buyer2.rpc("admin_resolve_dispute", { p_no: no, p_outcome: "refund", p_note: "" })).error).not.toBeNull();
    expect((await seller3.rpc("admin_resolve_dispute", { p_no: no, p_outcome: "release", p_note: "" })).error).not.toBeNull();
    const before = await overview();
    expect((await admin.rpc("admin_resolve_dispute", { p_no: no, p_outcome: "refund", p_note: "Sample decision." })).error).toBeNull();
    expect((await orderRow(no)).status).toBe("refunded");
    const o = await expectBalanced();
    expect(o.refunded - before.refunded).toBe(87000);
    expect(o.commission).toBe(before.commission);
  });

  it("a dispute resolved for the seller releases net and commission", async () => {
    const no = await shippedOrder();
    await buyer2.rpc("buyer_open_dispute", { p_no: no, p_reason_code: "not_as_described", p_note: "" });
    const before = await overview();
    expect((await admin.rpc("admin_resolve_dispute", { p_no: no, p_outcome: "release", p_note: "" })).error).toBeNull();
    expect((await orderRow(no)).status).toBe("completed");
    const o = await expectBalanced();
    expect(o.commission - before.commission).toBe(Math.round(87000 * 0.08));
    expect(o.seller_payable - before.seller_payable).toBe(87000 - Math.round(87000 * 0.08));
    expect((await admin.rpc("admin_resolve_dispute", { p_no: no, p_outcome: "refund", p_note: "" })).error?.message).toContain("invalid_transition");
  });
});

describe("requests arriving at the same moment", () => {
  it("two buyers ordering the last unit: exactly one order is created", async () => {
    expect(await stockOf("HC-DA-6336")).toBe(1);
    const ref = await refOf("HC-DA-6336");
    const results = await Promise.all([
      buyer1.rpc("buyer_create_order", { p_product_ref: ref, p_quantity: 1 }),
      buyer2.rpc("buyer_create_order", { p_product_ref: ref, p_quantity: 1 }),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error).error.message).toContain("insufficient_stock");
    expect(await stockOf("HC-DA-6336")).toBe(0);
  });

  it("the same payment event delivered 10 times at once is captured once", async () => {
    const no = await createOrder(buyer2, "MB-RE-0016", 2);
    const results = await Promise.all(Array.from({ length: 10 }, () => webhook(no, 62000, true, "t-storm-same")));
    const outcomes = results.map((r) => r.data);
    expect(outcomes.filter((o) => o === "captured")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "duplicate")).toHaveLength(9);
    await expectBalanced();
  });

  it("10 different success events for one order at once: one capture, nine ignored", async () => {
    const no = await createOrder(buyer2, "MB-RE-0016", 1);
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => webhook(no, 31000, true, `t-storm-diff-${i}`)));
    const outcomes = results.map((r) => r.data);
    expect(outcomes.filter((o) => o === "captured")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "ignored_state")).toHaveLength(9);
    const captures = await sql("select count(*)::int n from private.ledger_txns t join public.orders o on o.id = t.order_id where o.no = $1", [no]);
    expect(captures[0].n).toBe(1);
    await expectBalanced();
  });

  it("confirming delivery 5 times at once releases the money once", async () => {
    const no = await createOrder(buyer2, "MB-RE-0016", 1);
    await webhook(no, 31000);
    const seller5 = await as("seller5");
    await seller5.rpc("seller_mark_shipped", { p_no: no });
    const results = await Promise.all(Array.from({ length: 5 }, () => buyer2.rpc("buyer_confirm_delivery", { p_no: no })));
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    const releases = await sql("select count(*)::int n from private.ledger_txns t join public.orders o on o.id = t.order_id where o.no = $1 and t.kind = 'release'", [no]);
    expect(releases[0].n).toBe(1);
    await expectBalanced();
  });
});

describe("who may do what", () => {
  it("only the server can report a payment: buyers, sellers and visitors are refused", async () => {
    const no = await createOrder(buyer2, "HF-SS-0125", 1);
    const args = { p_provider: "mock", p_event_id: "forged-1", p_merchant_order_id: no, p_success: true, p_amount_piastres: 29000, p_payload: {} };
    for (const c of [buyer2, seller3, admin, anon()]) {
      const { error } = await c.rpc("payment_apply_event", args);
      expect(error).not.toBeNull();
    }
    expect((await orderRow(no)).status).toBe("pending_payment");
    await buyer2.rpc("buyer_cancel_order", { p_no: no });
  });

  it("a seller cannot ship an order that is not paid", async () => {
    const no = await createOrder(buyer1, "MT-WG-6330", 1);
    expect((await seller3.rpc("seller_mark_shipped", { p_no: no })).error).not.toBeNull();
    await buyer1.rpc("buyer_cancel_order", { p_no: no });
  });

  it("sellers and admins cannot place orders; visitors cannot either", async () => {
    const ref = await refOf("HV-CV-0012");
    for (const c of [seller3, admin, anon()]) {
      expect((await c.rpc("buyer_create_order", { p_product_ref: ref, p_quantity: 1 })).error).not.toBeNull();
    }
  });

  it("orders cannot be written directly, only through the functions", async () => {
    const o = (await buyer1.from("orders").select("id, no, status").limit(1)).data[0];
    await buyer1.from("orders").update({ status: "completed" }).eq("id", o.id);
    await buyer1.from("orders").delete().eq("id", o.id);
    const ins = await buyer1.from("orders").insert({ no: "DS-FORGED" });
    expect(ins.error).not.toBeNull();
    expect((await orderRow(o.no)).status).toBe(o.status);
  });

  it("a buyer sees only their orders, a seller only theirs, a visitor none", async () => {
    const b1 = (await buyer1.from("orders").select("buyer_code")).data;
    const b2 = (await buyer2.from("orders").select("buyer_code")).data;
    expect(new Set(b1.map((r) => r.buyer_code))).toEqual(new Set(["B-4K7PD"]));
    expect(new Set(b2.map((r) => r.buyer_code))).toEqual(new Set(["B-9WX2M"]));
    const s3 = (await seller3.from("orders").select("seller_code, status")).data;
    expect(new Set(s3.map((r) => r.seller_code))).toEqual(new Set(["S-9RWB"]));
    expect(s3.some((r) => r.status === "pending_payment" || r.status === "cancelled")).toBe(false);
    expect((await anon().from("orders").select("no")).data ?? []).toEqual([]);
  });

  it("money functions of the admin are refused for buyers and sellers", async () => {
    const sellerId = (await sql("select id from public.sellers where code = 'S-9RWB'"))[0].id;
    for (const c of [buyer1, seller3]) {
      expect((await c.rpc("admin_payout_seller", { p_seller_id: sellerId })).error).not.toBeNull();
      expect((await c.rpc("admin_ledger_overview")).error).not.toBeNull();
      expect((await c.rpc("admin_set_commission", { p_bps: 0 })).error).not.toBeNull();
      expect((await c.rpc("admin_seller_payables")).error).not.toBeNull();
      expect((await c.rpc("admin_webhook_events")).error).not.toBeNull();
    }
  });

  it("a buyer cannot hold more than 5 unpaid orders", async () => {
    const fresh = await as("buyer2");
    const open = (await sql("select count(*)::int n from public.orders where buyer_code = 'B-9WX2M' and status = 'pending_payment'"))[0].n;
    const made = [];
    for (let i = open; i < 5; i++) made.push(await createOrder(fresh, "HS-RS-3646", 1));
    const { error } = await fresh.rpc("buyer_create_order", { p_product_ref: await refOf("HS-RS-3646"), p_quantity: 1 });
    expect(error?.message).toContain("too_many_pending");
    for (const no of made) await fresh.rpc("buyer_cancel_order", { p_no: no });
  });
});

describe("the ledger itself", () => {
  it("cannot be edited or deleted, even with full database access", async () => {
    await expect(sql("update private.ledger_entries set amount_piastres = amount_piastres + 1")).rejects.toThrow(/ledger_is_append_only/);
    await expect(sql("delete from private.ledger_entries")).rejects.toThrow(/ledger_is_append_only/);
    await expect(sql("delete from private.ledger_txns")).rejects.toThrow(/ledger_is_append_only/);
  });

  it("refuses a transaction whose entries do not sum to zero", async () => {
    await expect(
      sql(`with t as (insert into private.ledger_txns (kind, idempotency_key) values ('capture', 'unbalanced-test') returning id)
           insert into private.ledger_entries (txn_id, account, amount_piastres) select id, 'provider', 500 from t`),
    ).rejects.toThrow(/ledger_unbalanced/);
    expect(await sql("select 1 from private.ledger_txns where idempotency_key = 'unbalanced-test'")).toEqual([]);
  });

  it("a commission change applies to new orders only", async () => {
    const old = await createOrder(buyer1, "HS-OR-0382", 1);
    expect((await admin.rpc("admin_set_commission", { p_bps: 1250 })).error).toBeNull();
    const fresh = await createOrder(buyer1, "HS-OR-0382", 1);
    expect((await orderRow(old)).commission_bps).toBe(800);
    expect((await orderRow(fresh)).commission_bps).toBe(1250);
    expect(Number((await orderRow(fresh)).commission_piastres)).toBe(Math.round(62000 * 0.125));
    expect((await admin.rpc("admin_set_commission", { p_bps: 5000 })).error).not.toBeNull();
    await admin.rpc("admin_set_commission", { p_bps: 800 });
    await buyer1.rpc("buyer_cancel_order", { p_no: old });
    await buyer1.rpc("buyer_cancel_order", { p_no: fresh });
  });

  it("is balanced at the end of everything above", async () => {
    const o = await expectBalanced();
    expect(o.captured).toBe(o.refunded + o.paid_out + o.commission + o.escrow_held + o.seller_payable);
  });
});
