// Crawl test: signs in as each kind of visitor, opens every page it can find (HTML and the React
// data payload) and fails if any private marker appears anywhere in a body or a header.
//
//   npm run test:crawl                 builds the app against the TEST project, starts it, crawls it
//   npm run test:crawl -- --base URL   crawls an app that is already running against the TEST project
//
// Heavy run: uses the same lock, time cap and test-only rule as the database tests.
import { spawn } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { targetEnv } from "./env.mjs";
import { EMAIL_DOMAIN, sellers, sellerCanaries } from "./seed-data.mjs";
import { setup, teardown } from "../tests/db/global-setup.mjs";
import { buildMockTransaction, signTransaction } from "../src/lib/payments.ts";

const env = targetEnv("test");
const argBase = process.argv.indexOf("--base");
let base = argBase > 0 ? process.argv[argBase + 1].replace(/\/$/, "") : null;
const PORT = 3112;
const MAX_PAGES = 400;
const CONCURRENCY = 4;
const BUYER_CANARIES = ["DSPRIVB", "000 000 02", `buyer1@${EMAIL_DOMAIN}`, `buyer2@${EMAIL_DOMAIN}`, `admin@${EMAIL_DOMAIN}`];

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.error("  FAIL " + msg);
};

// Text of the two seeded chat messages that the filter stopped. Only the admin may ever see it.
const CHAT_CANARIES = ["٠١٠٠٠٠٠٠١٥٥", "01000000155", "نتفق على سعر", "do you have whatsapp"];

function canariesFor(own, { admin = false } = {}) {
  return [...sellers.filter((s) => !own.includes(s.n)).flatMap((s) => sellerCanaries(s.n)), ...BUYER_CANARIES, ...(admin ? [] : CHAT_CANARIES)];
}

function findCanaries(text, canaries) {
  const lower = text.toLowerCase();
  const compact = lower.replace(/[\s\-+()]/g, "");
  return canaries.filter((c) => lower.includes(c.toLowerCase()) || compact.includes(c.toLowerCase().replace(/[\s\-+()]/g, "")));
}

async function cookieFor(key) {
  if (!key) return "";
  const jar = new Map();
  const client = createServerClient(env.supabaseUrl, env.publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email: `${key}@${EMAIL_DOMAIN}`, password: env.demoPassword });
  if (error) throw new Error(`sign in ${key}: ${error.message}`);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

async function get(path, cookie, extraHeaders = {}) {
  const res = await fetch(base + path, { redirect: "manual", headers: { cookie, ...extraHeaders } });
  const body = await res.text();
  const headers = [...res.headers].map(([k, v]) => `${k}: ${v}`).join("\n");
  return { status: res.status, body, headers, location: res.headers.get("location"), cache: res.headers.get("cache-control") ?? "" };
}

function linksIn(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="(\/(?:en|ar)[^"#]*)"/g)) out.add(m[1].replace(/&amp;/g, "&"));
  return out;
}

async function crawl(label, key, own, seeds, opts = {}) {
  const cookie = await cookieFor(key);
  const canaries = canariesFor(own, opts);
  const queue = ["/en", "/ar", ...seeds];
  const seen = new Set();
  let pages = 0;
  let redirects = 0;
  // The checks for one address: both forms of the page (HTML and the React data payload).
  const visit = async (path) => {
    for (const variant of [{}, { RSC: "1" }]) {
      const r = await get(path, cookie, variant);
      const kind = variant.RSC ? "data" : "html";
      const found = findCanaries(r.body + "\n" + r.headers, canaries);
      if (found.length) fail(`${label}: ${path} (${kind}) exposes ${[...new Set(found)].join(", ")}`);
      if (r.status >= 500) fail(`${label}: ${path} (${kind}) answered ${r.status}`);
      if (/at\s+\S+\s+\(.*:\d+:\d+\)|postgres|PGRST|violates|relation "/i.test(r.body)) fail(`${label}: ${path} (${kind}) shows an internal error message`);
      if (!variant.RSC) {
        if (r.status >= 300 && r.status < 400) {
          redirects++;
          const loc = r.location ? new URL(r.location, base) : null;
          if (loc && loc.origin === new URL(base).origin) queue.push(loc.pathname + loc.search);
        } else if (r.status === 200) {
          pages++;
          if (!/no-store/.test(r.cache)) fail(`${label}: ${path} is cacheable (${r.cache || "no header"})`);
          for (const l of linksIn(r.body)) if (!seen.has(l)) queue.push(l);
        }
      }
    }
  };
  // A few addresses at a time, so the whole run stays inside the 10-minute limit of a heavy run.
  while (queue.length && pages < MAX_PAGES) {
    const batch = [];
    while (queue.length && batch.length < CONCURRENCY) {
      const path = queue.shift();
      if (seen.has(path)) continue;
      seen.add(path);
      batch.push(path);
    }
    await Promise.all(batch.map(visit));
  }
  console.log(`  ${label}: ${pages} pages, ${redirects} redirects, ${seen.size} addresses tried`);
  return { cookie, seen };
}

async function expectRedirect(label, cookie, path) {
  const r = await get(path, cookie);
  if (!(r.status >= 300 && r.status < 400 && /\/signin/.test(r.location ?? ""))) fail(`${label}: ${path} should send to sign-in, got ${r.status}`);
}

async function main() {
  process.env.SEED_IMAGES = "1"; // pages are crawled with the showcase catalogue and its photographs
  process.env.SEED_DATASET = "showcase";
  await setup(); // lock + fresh seed of the TEST project
  let server;
  try {
    if (!base) {
      console.log("Building the app against the TEST project...");
      await new Promise((resolve, reject) => {
        const b = spawn("node scripts/with-env.mjs test npx next build", { shell: true, stdio: "ignore" });
        b.on("exit", (c) => (c === 0 ? resolve() : reject(new Error("build failed"))));
      });
      server = spawn(`node scripts/with-env.mjs test npx next start -p ${PORT}`, { shell: true, stdio: "ignore" });
      base = `http://localhost:${PORT}`;
    }
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(base + "/en")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }

    const { default: pg } = await import("pg");
    const db = new pg.Client({ connectionString: env.databaseUrl.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
    await db.connect();
    const refs = (await db.query("select p.ref, s.code from public.products p join public.sellers s on s.id = p.seller_id")).rows;
    const orders = (await db.query("select no, status, buyer_code, seller_code, total_piastres from public.orders order by created_at")).rows;
    const threads = (await db.query("select id, buyer_code, seller_code from public.threads")).rows;
    await db.end();
    const pendingRef = refs.find((r) => r.code === "S-W6PA").ref;
    const seller1Ref = refs.find((r) => r.code === "S-7Q4X").ref;

    // Addresses a curious visitor would type by hand, including ones that are not linked anywhere.
    const seeds = [
      "/en/admin", "/en/seller", "/en/buyer", "/en/seller/products/new", `/en/seller/products/${seller1Ref}`,
      `/en/p/${pendingRef}`, "/en/s/S-W6PA", ...sellers.map((s) => `/en/s/${s.code}`), ...refs.map((r) => `/en/p/${r.ref}`),
      "/en?q=DSPRIV", "/en?q=sample", "/en?q=000", "/en/p/P-NOPE00", "/en/s/S-NOPE",
      "/en/admin/orders", "/en/admin/money", "/ar/admin/money", "/en/admin/moderation", "/en/messages", "/ar/messages",
      ...threads.flatMap((t) => [`/en/messages/${t.id}`, `/ar/messages/${t.id}`]),
      ...orders.flatMap((o) => [`/en/orders/${o.no}`, `/ar/orders/${o.no}`, `/en/orders/${o.no}/invoice`, `/en/pay/${o.no}`]),
    ];

    console.log("Crawling as each visitor:");
    const anon = await crawl("visitor (not signed in)", null, [], seeds);
    const buyer = await crawl("buyer", "buyer1", [], seeds);
    const other = await crawl("another seller", "seller2", [2], seeds);
    await crawl("seller not approved yet", "seller6", [6], seeds);
    await crawl("admin (before any reveal)", "admin", [], seeds, { admin: true });
    // The two people in the conversation that has stopped messages: neither may see the stopped text.
    await crawl("buyer who was sent a blocked message", "buyer2", [], seeds);

    console.log("Checks:");
    for (const [label, c] of [["visitor", anon.cookie], ["buyer", buyer.cookie], ["another seller", other.cookie]]) {
      await expectRedirect(label, c, "/en/admin");
    }
    await expectRedirect("visitor", anon.cookie, "/en/seller");
    await expectRedirect("buyer", buyer.cookie, "/en/seller");

    // Hidden things stay hidden: a seller who is not approved has no public page and no public product.
    for (const [label, c] of [["visitor", anon.cookie], ["buyer", buyer.cookie]]) {
      for (const path of [`/en/p/${pendingRef}`, "/en/s/S-W6PA"]) {
        const r = await get(path, c);
        if (r.status !== 404) fail(`${label}: ${path} should be 404, got ${r.status}`);
      }
    }
    // Another seller cannot open seller 1's edit page.
    {
      const r = await get(`/en/seller/products/${seller1Ref}`, other.cookie);
      if (r.status !== 404) fail(`another seller: edit page of someone else's product should be 404, got ${r.status}`);
    }
    // Control: the scanner does see page content. Seller 1's own dashboard shows seller 1's own details.
    {
      const own = await get("/en/seller", await cookieFor("seller1"));
      if (!own.body.includes("DSPRIV01NAME")) fail("control: seller 1 should see their own identity on their dashboard");
      if (findCanaries(own.body, canariesFor([1])).length) fail("seller 1's dashboard shows someone else's private data");
    }
    // Orders: only the two parties and the admin can open an order; a seller cannot open an unpaid one.
    {
      const b1 = orders.find((o) => o.buyer_code === "B-4K7PD" && o.status !== "pending_payment");
      const b2 = orders.find((o) => o.buyer_code === "B-9WX2M");
      const unpaid = orders.find((o) => o.status === "pending_payment");
      const seller3 = await cookieFor("seller3");
      const checks = [
        ["buyer opening another buyer's order", buyer.cookie, `/en/orders/${b2.no}`, 404],
        ["buyer opening another buyer's invoice", buyer.cookie, `/en/orders/${b2.no}/invoice`, 404],
        ["seller opening an order of another seller", other.cookie, `/en/orders/${orders.find((o) => o.seller_code !== "S-M2KD" && o.status !== "pending_payment").no}`, 404],
        ["seller opening an unpaid order placed with them", seller3, `/en/orders/${unpaid.no}`, 404],
        ["seller opening an invoice", other.cookie, `/en/orders/${orders.find((o) => o.seller_code === "S-M2KD").no}/invoice`, 404],
        ["buyer opening their own order", buyer.cookie, `/en/orders/${b1.no}`, 200],
      ];
      for (const [label, cookie, path, want] of checks) {
        const r = await get(path, cookie);
        if (r.status !== want) fail(`${label}: ${path} should be ${want}, got ${r.status}`);
      }
      const v = await get(`/en/orders/${b1.no}`, anon.cookie);
      if (!(v.status >= 300 && v.status < 400)) fail(`visitor opening an order should be sent to sign-in, got ${v.status}`);
      for (const path of ["/en/admin/orders", "/en/admin/money"]) await expectRedirect("buyer", buyer.cookie, path);
    }

    // Conversations: only the two parties and the admin can open one.
    {
      const a = threads.find((t) => t.buyer_code === "B-4K7PD");
      const b = threads.find((t) => t.buyer_code === "B-9WX2M");
      const checks = [
        ["buyer opening their own conversation", buyer.cookie, `/en/messages/${a.id}`, 200],
        ["buyer opening someone else's conversation", buyer.cookie, `/en/messages/${b.id}`, 404],
        ["seller opening a conversation of another seller", other.cookie, `/en/messages/${a.id}`, 404],
        ["seller opening their own conversation", other.cookie, `/en/messages/${b.id}`, 200],
      ];
      for (const [label, cookie, path, want] of checks) {
        const r = await get(path, cookie);
        if (r.status !== want) fail(`${label}: ${path} should be ${want}, got ${r.status}`);
      }
      const v = await get(`/en/messages/${a.id}`, anon.cookie);
      if (!(v.status >= 300 && v.status < 400)) fail(`visitor opening a conversation should be sent to sign-in, got ${v.status}`);
      await expectRedirect("buyer", buyer.cookie, "/en/admin/moderation");
      // Control: the admin's moderation page does show the stopped text (so the scanner would see it).
      const mod = await get("/en/admin/moderation", await cookieFor("admin"));
      if (!mod.body.includes("do you have whatsapp")) fail("control: the admin's moderation queue should show the held message");
      // The sender of a stopped message sees a placeholder, not the text.
      const senderView = await get(`/en/messages/${b.id}`, other.cookie);
      if (!senderView.body.includes("Not delivered")) fail("the sender should see a 'not delivered' placeholder for their blocked message");
    }

    // Webhook: the signature is checked before anything else, and a replay changes nothing.
    {
      const hook = (body, hmac, method = "POST") =>
        fetch(`${base}/api/webhooks/payments${hmac === null ? "" : `?hmac=${hmac}`}`, {
          method,
          headers: { "content-type": "application/json" },
          body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
        });
      const unpaid = orders.find((o) => o.status === "pending_payment");
      const cb = buildMockTransaction(unpaid.no, Number(unpaid.total_piastres), true, 700000001);
      const good = signTransaction(cb.obj, env.paymentHmacSecret);
      const expectStatus = async (label, res, want) => {
        if (res.status !== want) fail(`webhook ${label}: expected ${want}, got ${res.status}`);
      };
      await expectStatus("without a signature", await hook(cb, null), 401);
      await expectStatus("with a wrong signature", await hook(cb, signTransaction(cb.obj, "wrong-secret")), 401);
      await expectStatus("with a body changed after signing", await hook({ ...cb, obj: { ...cb.obj, amount_cents: 1 } }, good), 401);
      await expectStatus("with a body that is not JSON", await hook("not json", good), 400);
      await expectStatus("with GET", await hook(null, good, "GET"), 405);
      const stillPending = await get(`/en/orders/${unpaid.no}`, buyer.cookie);
      if (!stillPending.body.includes("Waiting for payment")) fail("webhook: a rejected callback changed the order");
      const first = await hook(cb, good);
      const firstBody = await first.json();
      if (first.status !== 200 || firstBody.result !== "captured") fail(`webhook: a valid callback should capture, got ${first.status} ${JSON.stringify(firstBody)}`);
      const replay = await (await hook(cb, good)).json();
      if (replay.result !== "duplicate") fail(`webhook: a replay should be a duplicate, got ${JSON.stringify(replay)}`);
      const paid = await get(`/en/orders/${unpaid.no}`, buyer.cookie);
      if (!paid.body.includes("Paid, payment protected")) fail("webhook: the order page does not show the captured payment");
    }
    console.log("  access rules, order pages, conversations, webhook and control: done");
  } finally {
    if (server) spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    await teardown();
  }

  if (failures.length) {
    console.error(`\nCRAWL TEST FAILED: ${failures.length} problem(s).`);
    process.exit(1);
  }
  console.log("\nCRAWL TEST PASSED: no private marker on any page, in any payload or header.");
}

main().catch((e) => {
  console.error("crawl test error:", e.message);
  process.exit(1);
});
