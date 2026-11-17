// The 10-product limit, tested under parallel requests against the real database.
import { describe, it, expect, beforeAll } from "vitest";
import { as, sql, sellerIdByCode } from "./helpers.mjs";

let seller1Id;
let seller2Id;
let categoryId;

const product = (sellerId, i) => ({
  seller_id: sellerId,
  category_id: categoryId,
  title_en: `Limit test part ${i}`,
  title_ar: `قطعة اختبار ${i}`,
  part_number: `LT-${String(i).padStart(4, "0")}`,
  condition: "new",
  price_piastres: 10000,
  stock: 1,
});

const count = async (sellerId) => (await sql("select count(*)::int n from public.products where seller_id = $1", [sellerId]))[0].n;

beforeAll(async () => {
  seller1Id = await sellerIdByCode("S-7Q4X");
  seller2Id = await sellerIdByCode("S-M2KD");
  categoryId = (await sql("select id from public.categories order by sort limit 1"))[0].id;
});

describe("at most 10 products per seller", () => {
  it("seller 1 starts with 8 products", async () => {
    expect(await count(seller1Id)).toBe(8);
  });

  it("20 inserts sent at the same moment: exactly 2 succeed, the seller ends with 10", async () => {
    const c = await as("seller1");
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => c.from("products").insert(product(seller1Id, i))));
    const ok = results.filter((r) => !r.error);
    const refused = results.filter((r) => r.error);
    expect(ok).toHaveLength(2);
    expect(refused).toHaveLength(18);
    for (const r of refused) expect(r.error.message).toContain("product_limit_reached");
    expect(await count(seller1Id)).toBe(10);
  });

  it("an 11th product is refused", async () => {
    const c = await as("seller1");
    const { error } = await c.from("products").insert(product(seller1Id, 99));
    expect(error?.message).toContain("product_limit_reached");
    expect(await count(seller1Id)).toBe(10);
  });

  it("a batch that would pass the limit is refused as a whole", async () => {
    const c = await as("seller2"); // has 6
    const { error } = await c.from("products").insert(Array.from({ length: 5 }, (_, i) => product(seller2Id, 200 + i)));
    expect(error?.message).toContain("product_limit_reached");
    expect(await count(seller2Id)).toBe(6);
  });

  it("the limit also holds for direct database connections in parallel", async () => {
    // seller 2 has 6: 12 connections each try one insert, 4 must win.
    const pg = (await import("pg")).default;
    const { env } = await import("./helpers.mjs");
    const run = async (i) => {
      const cl = new pg.Client({ connectionString: env.databaseUrl.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
      await cl.connect();
      try {
        await cl.query(
          "insert into public.products (seller_id, category_id, title_en, title_ar, part_number, condition, price_piastres, stock) values ($1, $2, $3, $4, $5, 'new', 10000, 1)",
          [seller2Id, categoryId, `Direct part ${i}`, `قطعة مباشرة ${i}`, `DP-${i}`],
        );
        return "ok";
      } catch (e) {
        return e.message;
      } finally {
        await cl.end();
      }
    };
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => run(i)));
    expect(results.filter((r) => r === "ok")).toHaveLength(4);
    expect(results.filter((r) => r.includes("product_limit_reached"))).toHaveLength(8);
    expect(await count(seller2Id)).toBe(10);
  });

  it("deleting a product frees a slot", async () => {
    const c = await as("seller1");
    const { data } = await c.from("products").select("id").like("part_number", "LT-%").limit(1);
    await c.from("products").delete().eq("id", data[0].id);
    expect(await count(seller1Id)).toBe(9);
    const { error } = await c.from("products").insert(product(seller1Id, 300));
    expect(error).toBeNull();
    expect(await count(seller1Id)).toBe(10);
  });
});

describe("a seller can only touch their own products", () => {
  it("cannot insert a product for another seller", async () => {
    const c = await as("seller3");
    const { error } = await c.from("products").insert(product(seller1Id, 400));
    expect(error).not.toBeNull();
  });

  it("cannot edit or delete another seller's product", async () => {
    const c = await as("seller3");
    const target = (await sql("select id, title_en from public.products where seller_id = $1 limit 1", [seller2Id]))[0];
    await c.from("products").update({ title_en: "Hijacked" }).eq("id", target.id);
    await c.from("products").delete().eq("id", target.id);
    const after = await sql("select title_en from public.products where id = $1", [target.id]);
    expect(after[0].title_en).toBe(target.title_en);
  });

  it("cannot move a product to another seller or change its public ref", async () => {
    const c = await as("seller3");
    const own = (await c.from("products").select("id, ref").limit(1)).data[0];
    const r1 = await c.from("products").update({ seller_id: seller1Id }).eq("id", own.id);
    const r2 = await c.from("products").update({ ref: "P-HACKED" }).eq("id", own.id);
    expect(r1.error).not.toBeNull();
    expect(r2.error).not.toBeNull();
  });

  it("a buyer and a visitor cannot insert products", async () => {
    const { anon } = await import("./helpers.mjs");
    const b = await as("buyer1");
    expect((await b.from("products").insert(product(seller1Id, 500))).error).not.toBeNull();
    expect((await anon().from("products").insert(product(seller1Id, 501))).error).not.toBeNull();
  });

  it("a seller cannot approve or verify themselves", async () => {
    const c = await as("seller6");
    await c.from("sellers").update({ status: "active", verified: true }).eq("code", "S-W6PA");
    const { error } = await c.rpc("admin_set_seller_status", { p_seller_id: await sellerIdByCode("S-W6PA"), p_status: "active", p_verified: true });
    expect(error).not.toBeNull();
    const row = (await sql("select status, verified from public.sellers where code = 'S-W6PA'"))[0];
    expect(row).toEqual({ status: "pending", verified: false });
  });
});
