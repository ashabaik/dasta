// Seller ratings: stars only, one per completed order, by the buyer of that order.
import { describe, it, expect, beforeAll } from "vitest";
import { anon, as, sql } from "./helpers.mjs";

let buyer1, buyer2, seller4;
const orderIn = async (buyerCode, status, sellerCode = null) =>
  (await sql("select no from public.orders where buyer_code = $1 and status = $2 and ($3::text is null or seller_code = $3) order by created_at limit 1", [buyerCode, status, sellerCode]))[0]?.no;
const seller = async (code) => (await sql("select rating_avg, rating_count from public.sellers where code = $1", [code]))[0];

beforeAll(async () => {
  [buyer1, buyer2, seller4] = await Promise.all([as("buyer1"), as("buyer2"), as("seller4")]);
});

describe("ratings", () => {
  it("the sample data starts with no ratings at all", async () => {
    expect((await sql("select count(*)::int n from public.order_ratings"))[0].n).toBe(0);
    expect((await sql("select count(*)::int n from public.sellers where rating_count > 0 or rating_avg is not null"))[0].n).toBe(0);
  });

  it("only a completed order can be rated", async () => {
    const shipped = await orderIn("B-4K7PD", "shipped");
    expect((await buyer1.rpc("buyer_rate_order", { p_no: shipped, p_stars: 5 })).error?.message).toContain("invalid_transition");
  });

  it("only the buyer of the order can rate it, with 1 to 5 stars, once", async () => {
    const no = await orderIn("B-9WX2M", "completed", "S-K8TN");
    for (const c of [buyer1, seller4, anon()]) expect((await c.rpc("buyer_rate_order", { p_no: no, p_stars: 5 })).error).not.toBeNull();
    for (const stars of [0, 6, -1]) expect((await buyer2.rpc("buyer_rate_order", { p_no: no, p_stars: stars })).error).not.toBeNull();
    expect((await buyer2.rpc("buyer_rate_order", { p_no: no, p_stars: 4 })).error).toBeNull();
    expect((await buyer2.rpc("buyer_rate_order", { p_no: no, p_stars: 1 })).error?.message).toContain("already_rated");
    expect(await seller("S-K8TN")).toEqual({ rating_avg: "4.00", rating_count: 1 });
  });

  it("the average is the mean of all ratings", async () => {
    const no = await orderIn("B-4K7PD", "completed", "S-7Q4X");
    expect((await buyer1.rpc("buyer_rate_order", { p_no: no, p_stars: 5 })).error).toBeNull();
    expect(await seller("S-7Q4X")).toEqual({ rating_avg: "5.00", rating_count: 1 });
  });

  it("ratings cannot be written directly", async () => {
    const before = (await sql("select count(*)::int n from public.order_ratings"))[0].n;
    const any = (await sql("select order_id, seller_id from public.order_ratings limit 1"))[0];
    for (const c of [buyer1, seller4, anon()]) {
      await c.from("order_ratings").insert({ order_id: any.order_id, seller_id: any.seller_id, stars: 5 });
      await c.from("order_ratings").update({ stars: 1 }).eq("order_id", any.order_id);
      await c.from("order_ratings").delete().eq("order_id", any.order_id);
      await c.from("sellers").update({ rating_avg: 5, rating_count: 99 }).eq("code", "S-K8TN");
    }
    expect((await sql("select count(*)::int n from public.order_ratings"))[0].n).toBe(before);
    expect((await seller("S-K8TN")).rating_count).toBe(1);
  });
});
