// Chat, the contact filter end to end, the moderation queue and strikes, against the real database.
// Every phone number and address in this file is made up.
import { describe, it, expect, beforeAll } from "vitest";
import { anon, as, service, sql } from "./helpers.mjs";
import { checkText } from "../../src/lib/contact-filter.ts";

let buyer1, buyer2, seller1, seller2, seller3, admin, svc;
const users = {};
let threadA; // buyer1 <-> seller1 (seeded)

const userId = async (key) => (await sql("select id from auth.users where email = $1", [`${key}@dasta.example`]))[0].id;
const refOf = async (pn) => (await sql("select ref from public.products where part_number = $1", [pn]))[0].ref;
const strikesOf = async (key) => (await sql("select count(*)::int n from private.chat_strikes where user_id = $1 and cleared_at is null", [users[key]]))[0].n;

/** What the server action does: run the filter, then store through the server-only function. */
async function post(threadId, key, body, previous = []) {
  const v = checkText(body, previous);
  const { data, error } = await svc.rpc("chat_post_message", { p_thread_id: threadId, p_user_id: users[key], p_body: body, p_verdict: v.verdict, p_reasons: v.reasons });
  return { ...(data ?? {}), error: error?.message ?? null, verdict: v.verdict };
}
const visibleTo = async (client, threadId) => (await client.from("messages").select("id, sender, body, status").eq("thread_id", threadId).order("id")).data ?? [];

beforeAll(async () => {
  [buyer1, buyer2, seller1, seller2, seller3, admin] = await Promise.all(["buyer1", "buyer2", "seller1", "seller2", "seller3", "admin"].map(as));
  svc = service();
  for (const k of ["buyer1", "buyer2", "seller1", "seller2", "seller3", "admin"]) users[k] = await userId(k);
  threadA = (await sql("select id from public.threads where buyer_code = 'B-4K7PD' and seller_code = 'S-7Q4X'"))[0].id;
});

describe("who can read and write a conversation", () => {
  it("both parties and the admin see the delivered messages; nobody else sees the thread", async () => {
    for (const c of [buyer1, seller1, admin]) expect((await visibleTo(c, threadA)).length).toBe(4);
    for (const c of [buyer2, seller2, seller3, anon()]) {
      expect(await visibleTo(c, threadA)).toEqual([]);
      expect((await c.from("threads").select("id").eq("id", threadA)).data ?? []).toEqual([]);
    }
  });

  it("nobody can insert, change or delete a message directly", async () => {
    const count = "select count(*)::int n, string_agg(body, '|' order by id) b from public.messages where thread_id = $1";
    const before = await sql(count, [threadA]);
    for (const c of [buyer1, seller1, admin, anon()]) {
      expect((await c.from("messages").insert({ thread_id: threadA, sender: "buyer", body: "call 01000000123", status: "delivered" })).error).not.toBeNull();
      await c.from("messages").update({ body: "edited" }).eq("thread_id", threadA);
      await c.from("messages").delete().eq("thread_id", threadA);
    }
    expect(await sql(count, [threadA])).toEqual(before);
  });

  it("the posting function is for the server only", async () => {
    const args = { p_thread_id: threadA, p_user_id: users.buyer1, p_body: "call 01000000123", p_verdict: "clean", p_reasons: [] };
    for (const c of [buyer1, seller1, admin, anon()]) expect((await c.rpc("chat_post_message", args)).error).not.toBeNull();
  });

  it("a user who is not part of the thread cannot post into it, even through the server function", async () => {
    for (const k of ["buyer2", "seller2", "admin"]) expect((await post(threadA, k, "hello")).error).toContain("not_allowed");
  });

  it("only a buyer can open a thread, there is one per product, and hidden products have none", async () => {
    const ref = await refOf("HV-PR-1010");
    const a = await buyer1.rpc("chat_open_thread", { p_product_ref: ref });
    const b = await buyer1.rpc("chat_open_thread", { p_product_ref: ref });
    expect(a.error).toBeNull();
    expect(b.data).toBe(a.data);
    for (const c of [seller1, admin, anon()]) expect((await c.rpc("chat_open_thread", { p_product_ref: ref })).error).not.toBeNull();
    expect((await buyer1.rpc("chat_open_thread", { p_product_ref: await refOf("HP-GP-0080") })).error?.message).toContain("not_available");
  });
});

describe("the contact filter, end to end", () => {
  it("an ordinary message is delivered to the other party as written", async () => {
    const r = await post(threadA, "buyer1", "هل الملف ٢٤ فولت؟ محتاج ٢ قطعة");
    expect(r).toMatchObject({ status: "delivered", error: null });
    expect((await visibleTo(seller1, threadA)).at(-1).body).toBe("هل الملف ٢٤ فولت؟ محتاج ٢ قطعة");
  });

  it.each([
    ["a phone number in Arabic-Indic digits", "كلمني ٠١٠٠٠٠٠٠١٧٧"],
    ["a phone number with spaces", "0 1 0 0 0 0 0 0 1 7 7"],
    ["a number spelled out", "zero one zero zero zero zero zero zero one seven seven"],
    ["an e-mail written with at and dot", "sample.person at example dot com"],
    ["a link", "see example.com/price-list"],
  ])("%s is blocked: the other party gets nothing, the text stays with the admin", async (_label, text) => {
    const strikes = await strikesOf("buyer1");
    const r = await post(threadA, "buyer1", text);
    expect(r).toMatchObject({ status: "blocked", error: null });
    // the other party: no row at all
    expect((await visibleTo(seller1, threadA)).some((m) => m.id === r.id)).toBe(false);
    // the sender: a placeholder without text
    expect((await visibleTo(buyer1, threadA)).find((m) => m.id === r.id)).toMatchObject({ status: "blocked", body: "" });
    // the text exists only in the private schema
    expect((await sql("select body from public.messages where id = $1", [r.id]))[0].body).toBe("");
    expect((await sql("select body from private.message_originals where message_id = $1", [r.id]))[0].body).toBe(text);
    expect(await strikesOf("buyer1")).toBe(strikes + 1);
    await sql("update private.chat_strikes set cleared_at = now() where user_id = $1 and cleared_at is null", [users.buyer1]);
  });

  it("a number split over three messages is stopped at the message that completes it", async () => {
    // 3 + 3 digits is still short; the third fragment makes it 11 digits.
    const a = await post(threadA, "seller1", "010", []);
    const b = await post(threadA, "seller1", "000", ["010"]);
    const c = await post(threadA, "seller1", "00177", ["010", "000"]);
    expect([a.status, b.status, c.status]).toEqual(["delivered", "delivered", "blocked"]);
    await sql("update private.chat_strikes set cleared_at = now() where user_id = $1 and cleared_at is null", [users.seller1]);
  });

  it("the database check holds a message even when the server said it was clean", async () => {
    const { data, error } = await svc.rpc("chat_post_message", { p_thread_id: threadA, p_user_id: users.seller1, p_body: "ring 01000000177", p_verdict: "clean", p_reasons: [] });
    expect(error).toBeNull();
    expect(data.status).toBe("held");
    expect((await sql("select reasons from private.message_originals where message_id = $1", [data.id]))[0].reasons).toContain("database_check");
    expect((await visibleTo(buyer1, threadA)).some((m) => m.id === data.id)).toBe(false);
  });
});

describe("moderation queue and strikes", () => {
  it("only the admin can see the queue or decide", async () => {
    for (const c of [buyer1, seller1, anon()]) {
      expect((await c.rpc("admin_moderation_queue")).error).not.toBeNull();
      expect((await c.rpc("admin_moderate", { p_message_id: 1, p_decision: "release" })).error).not.toBeNull();
      expect((await c.rpc("admin_chat_strikes")).error).not.toBeNull();
      expect((await c.rpc("admin_clear_strikes", { p_code: "S-7Q4X" })).error).not.toBeNull();
    }
  });

  it("the queue shows the original text, who wrote it and why it was stopped", async () => {
    const r = await post(threadA, "buyer1", "do you have whatsapp?");
    expect(r.status).toBe("held");
    const row = (await admin.rpc("admin_moderation_queue")).data.find((q) => q.message_id === r.id);
    expect(row).toMatchObject({ sender_code: "B-4K7PD", other_code: "S-7Q4X", severity: "hold", body: "do you have whatsapp?" });
    expect(row.reasons).toContain("other_app");
  });

  it("releasing a held message delivers it as written and costs nothing", async () => {
    const r = await post(threadA, "buyer1", "Is it compatible with Telegram-brand valves?");
    expect(r.status).toBe("held");
    const strikes = await strikesOf("buyer1");
    expect((await admin.rpc("admin_moderate", { p_message_id: r.id, p_decision: "release" })).error).toBeNull();
    expect((await visibleTo(seller1, threadA)).find((m) => m.id === r.id)).toMatchObject({ status: "released", body: "Is it compatible with Telegram-brand valves?" });
    expect(await strikesOf("buyer1")).toBe(strikes);
    expect((await admin.rpc("admin_moderate", { p_message_id: r.id, p_decision: "confirm" })).error).not.toBeNull(); // already reviewed
  });

  it("confirming a held message keeps it hidden and adds a strike; releasing a blocked one clears its strike", async () => {
    const held = await post(threadA, "seller1", "ابعتلي على تليجرام");
    const s0 = await strikesOf("seller1");
    await admin.rpc("admin_moderate", { p_message_id: held.id, p_decision: "confirm" });
    expect(await strikesOf("seller1")).toBe(s0 + 1);
    expect((await visibleTo(buyer1, threadA)).some((m) => m.id === held.id)).toBe(false);
    const blocked = await post(threadA, "seller1", "Order code 0100000017799 on the box");
    expect(blocked.status).toBe("blocked");
    expect(await strikesOf("seller1")).toBe(s0 + 2);
    await admin.rpc("admin_moderate", { p_message_id: blocked.id, p_decision: "release" });
    expect(await strikesOf("seller1")).toBe(s0 + 1);
    expect((await visibleTo(buyer1, threadA)).find((m) => m.id === blocked.id).body).toBe("Order code 0100000017799 on the box");
    await admin.rpc("admin_clear_strikes", { p_code: "S-7Q4X" });
  });

  it("three strikes suspend the chat until the admin clears them", async () => {
    await admin.rpc("admin_clear_strikes", { p_code: "B-4K7PD" });
    for (const n of ["01000000171", "01000000172", "01000000173"]) expect((await post(threadA, "buyer1", `call ${n}`)).status).toBe("blocked");
    expect((await buyer1.rpc("chat_my_status")).data[0]).toEqual({ strikes: 3, suspended: true });
    expect((await post(threadA, "buyer1", "hello again")).error).toContain("chat_suspended");
    const list = (await admin.rpc("admin_chat_strikes")).data.find((r) => r.code === "B-4K7PD");
    expect(list).toMatchObject({ strikes: 3, suspended: true });
    expect((await admin.rpc("admin_clear_strikes", { p_code: "B-4K7PD" })).data).toBe(3);
    expect((await post(threadA, "buyer1", "hello again")).status).toBe("delivered");
  });

  it("a user cannot send more than 30 messages in 10 minutes", async () => {
    const id = (await buyer2.rpc("chat_open_thread", { p_product_ref: await refOf("MB-DG-6205") })).data;
    const sent = (
      await sql(
        "select count(*)::int n from public.messages m join public.threads t on t.id = m.thread_id where t.buyer_code = 'B-9WX2M' and m.sender = 'buyer' and m.created_at > now() - interval '10 minutes'",
      )
    )[0].n;
    for (let i = sent; i < 30; i++) expect((await post(id, "buyer2", `message ${i}`)).status).toBe("delivered");
    expect((await post(id, "buyer2", "one too many")).error).toContain("rate_limited");
  });
});

describe("the same guard on listings", () => {
  const listing = (sellerId, categoryId, extra) => ({
    seller_id: sellerId,
    category_id: categoryId,
    title_en: "Guard test valve",
    title_ar: "صمام اختبار",
    part_number: "GT-0001",
    condition: "new",
    price_piastres: 10000,
    stock: 1,
    ...extra,
  });
  const ids = async () => ({
    sellerId: (await sql("select id from public.sellers where code = 'S-9RWB'"))[0].id,
    categoryId: (await sql("select id from public.categories limit 1"))[0].id,
  });

  it("a listing with contact details, written straight through the API, is saved as under review and hidden", async () => {
    const { sellerId, categoryId } = await ids();
    const a = await seller3.from("products").insert(listing(sellerId, categoryId, { description_en: "Better price by phone: 0100 000 0177" })).select("ref, status").single();
    const b = await seller3.from("products").insert(listing(sellerId, categoryId, { part_number: "GT-0002", title_ar: "صمام ٠١٠٠٠٠٠٠١٧٧" })).select("ref, status").single();
    const c = await seller3.from("products").insert(listing(sellerId, categoryId, { part_number: "GT-0003", specs: [{ k_en: "Site", k_ar: "Site", v: "example.com" }] })).select("ref, status").single();
    for (const r of [a, b, c]) {
      expect(r.error).toBeNull();
      expect(r.data.status).toBe("flagged");
      expect((await anon().from("products").select("ref").eq("ref", r.data.ref)).data).toEqual([]);
      expect((await buyer1.from("products").select("ref").eq("ref", r.data.ref)).data).toEqual([]);
    }
    // the seller cannot switch it back on
    await seller3.from("products").update({ status: "active" }).eq("ref", a.data.ref);
    expect((await sql("select status from public.products where ref = $1", [a.data.ref]))[0].status).toBe("flagged");
    // the admin can
    expect((await admin.from("products").update({ status: "active" }).eq("ref", a.data.ref).select("ref")).data).toHaveLength(1);
    expect((await anon().from("products").select("ref").eq("ref", a.data.ref)).data).toHaveLength(1);
  });

  it("a normal listing is not flagged", async () => {
    const { sellerId, categoryId } = await ids();
    const r = await seller3
      .from("products")
      .insert(listing(sellerId, categoryId, { part_number: "GT-0004", description_en: "Bore 63 mm, rod 36 mm, 250 bar, delivery by 17/11/2026" }))
      .select("status")
      .single();
    expect(r.data.status).toBe("active");
  });

  it("editing a clean listing to add contact details flags it", async () => {
    const own = (await seller3.from("products").select("ref, status").eq("part_number", "GT-0004").single()).data;
    expect(own.status).toBe("active");
    await seller3.from("products").update({ description_ar: "للتواصل sample.person@example.com" }).eq("ref", own.ref);
    expect((await sql("select status from public.products where ref = $1", [own.ref]))[0].status).toBe("flagged");
  });
});
