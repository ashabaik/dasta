// Wholesale terms: minimum order quantity and price breaks are decided by the database, never by the browser.
import { beforeAll, describe, expect, it } from "vitest";
import { as, sql, sellerIdByCode } from "./helpers.mjs";

let buyer1, seller5, seller4, ref, sellerId, categoryId;
const BASE = 10000; // piastres
const BREAKS = [
  { qty: 40, price_piastres: 9000 },
  { qty: 100, price_piastres: 8000 },
];

beforeAll(async () => {
  [buyer1, seller5, seller4] = await Promise.all([as("buyer1"), as("seller5"), as("seller4")]);
  sellerId = await sellerIdByCode("S-3HVC");
  categoryId = (await sql("select id from public.categories order by sort limit 1"))[0].id;
  const { data, error } = await seller5
    .from("products")
    .insert({
      seller_id: sellerId, category_id: categoryId, title_en: "Wholesale test item", title_ar: "صنف اختبار الجملة", part_number: "WT-0001",
      condition: "new", price_piastres: BASE, stock: 1000, unit_en: "box", unit_ar: "علبة", min_order_qty: 10, lead_days: 5, price_breaks: BREAKS,
    })
    .select("ref")
    .single();
  if (error) throw new Error(error.message);
  ref = data.ref;
});

const order = (qty) => buyer1.rpc("buyer_create_order", { p_product_ref: ref, p_quantity: qty });
const row = async (no) => (await sql("select unit_price_piastres, quantity, total_piastres from public.orders where no = $1", [no]))[0];
const cancel = (no) => buyer1.rpc("buyer_cancel_order", { p_no: no });

describe("minimum order quantity", () => {
  it("an order below the minimum is refused and takes no stock", async () => {
    const before = (await sql("select stock from public.products where ref = $1", [ref]))[0].stock;
    const { error } = await order(9);
    expect(error?.message).toContain("below_minimum");
    expect((await sql("select stock from public.products where ref = $1", [ref]))[0].stock).toBe(before);
  });

  it("an order at the minimum is accepted at the base price", async () => {
    const { data: no, error } = await order(10);
    expect(error).toBeNull();
    expect(await row(no)).toEqual({ unit_price_piastres: String(BASE), quantity: 10, total_piastres: String(BASE * 10) });
    await cancel(no);
  });
});

describe("price breaks", () => {
  it("the unit price follows the ordered quantity", async () => {
    for (const [qty, unit] of [[39, BASE], [40, 9000], [99, 9000], [100, 8000], [250, 8000]]) {
      const { data: no, error } = await order(qty);
      expect(error, `qty ${qty}`).toBeNull();
      expect(await row(no), `qty ${qty}`).toEqual({ unit_price_piastres: String(unit), quantity: qty, total_piastres: String(unit * qty) });
      await cancel(no);
    }
  });

  it("the order function takes no price from the caller", async () => {
    const { error } = await buyer1.rpc("buyer_create_order", { p_product_ref: ref, p_quantity: 10, p_unit_price: 1 });
    expect(error).not.toBeNull();
  });

  it("the table refuses price breaks that do not make sense", async () => {
    const bad = [
      [{ qty: 40, price_piastres: 11000 }], // dearer than the base price
      [{ qty: 5, price_piastres: 9000 }], // below the minimum order
      [{ qty: 40, price_piastres: 9000 }, { qty: 30, price_piastres: 8000 }], // quantities must rise
      [{ qty: 40, price_piastres: 9000 }, { qty: 100, price_piastres: 9500 }], // prices must fall
      [{ qty: 40, price_piastres: 0 }],
      [{ qty: 40.5, price_piastres: 9000 }],
      [{ qty: 20, price_piastres: 9500 }, { qty: 40, price_piastres: 9000 }, { qty: 60, price_piastres: 8500 }, { qty: 80, price_piastres: 8000 }, { qty: 100, price_piastres: 7500 }], // five steps
      { qty: 40, price_piastres: 9000 }, // not a list
    ];
    for (const breaks of bad) {
      const { error } = await seller5.from("products").update({ price_breaks: breaks }).eq("ref", ref);
      expect(error, JSON.stringify(breaks)).not.toBeNull();
    }
    expect((await sql("select price_breaks from public.products where ref = $1", [ref]))[0].price_breaks).toEqual(BREAKS);
  });

  it("raising the minimum above a price break is refused too", async () => {
    const { error } = await seller5.from("products").update({ min_order_qty: 40 }).eq("ref", ref);
    expect(error).not.toBeNull();
  });
});

describe("who may set the terms", () => {
  it("the supplier can change the terms of an own listing", async () => {
    const { data, error } = await seller5.from("products").update({ lead_days: 7, unit_en: "carton", unit_ar: "كرتونة" }).eq("ref", ref).select("lead_days, unit_en");
    expect(error).toBeNull();
    expect(data).toEqual([{ lead_days: 7, unit_en: "carton" }]);
  });

  it("another supplier cannot", async () => {
    const { data } = await seller4.from("products").update({ min_order_qty: 1, price_breaks: [] }).eq("ref", ref).select("ref");
    expect(data ?? []).toEqual([]);
    expect((await sql("select min_order_qty from public.products where ref = $1", [ref]))[0].min_order_qty).toBe(10);
  });

  it("a unit that carries contact details puts the listing under review", async () => {
    const { data } = await seller5.from("products").update({ unit_en: "call 01000000199" }).eq("ref", ref).select("status");
    expect(data).toEqual([{ status: "flagged" }]);
    await sql("update public.products set status = 'active', unit_en = 'box' where ref = $1", [ref]);
  });
});
