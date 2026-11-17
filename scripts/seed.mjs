// Resets the sample data of one Supabase project and seeds it again.
//   node scripts/seed.mjs --target test
// Deletes ALL marketplace rows and ALL auth users of that project, then recreates the sample set.
// Two datasets: the showcase catalogue the live site shows (default), or the neutral fixtures the
// database tests run against (tests/fixtures.mjs).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { targetEnv, targetFromArgs } from "./env.mjs";
import { users, sellers, showcase, sellerIdentity, buyerIdentity } from "./seed-data.mjs";
import { checkText } from "../src/lib/contact-filter.ts";

export async function seed(target, opts = {}) {
  return seedWithEnv(targetEnv(target), opts);
}

/**
 * env: { target, databaseUrl, supabaseUrl, secretKey, demoPassword }.
 * dataset: { products, sampleOrders, sampleThreads, images } (default: the showcase catalogue).
 * images: also upload the sample photographs (only the showcase has any).
 */
export async function seedWithEnv(env, { quiet = false, images = true, dataset = showcase } = {}) {
  const { products, sampleOrders, sampleThreads } = dataset;
  const target = env.target;
  const log = (...a) => quiet || console.log(...a);
  const admin = createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = new pg.Client({ connectionString: env.databaseUrl.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    // 1. wipe
    await db.query("truncate private.chat_strikes, private.message_originals, public.messages, public.threads");
    await db.query(`truncate private.ledger_entries, private.ledger_txns, private.payouts, private.webhook_events,
      private.payment_intents, private.dispute_notes, public.disputes, public.order_events, public.order_ratings, public.orders`);
    await db.query("update private.settings set value = '800'::jsonb where key = 'commission_bps'");
    await db.query("delete from public.sellers");   // cascades to products, images, private rows
    await db.query("delete from public.buyers");
    await db.query("delete from private.identity_reveals");
    for (;;) {
      // uploaded photos
      const { data: files, error } = await admin.storage.from("product-images").list("", { limit: 100 });
      if (error) throw error;
      if (!files.length) break;
      const r = await admin.storage.from("product-images").remove(files.map((f) => f.name));
      if (r.error) throw r.error;
    }
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) throw error;
      if (!data.users.length) break;
      for (const u of data.users) {
        const r = await admin.auth.admin.deleteUser(u.id);
        if (r.error) throw r.error;
      }
    }

    // 2. users (confirmed directly: sign-in never depends on e-mail delivery)
    const ids = {};
    for (const u of users) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: env.demoPassword,
        email_confirm: true,
        // The sign-up trigger accepts only "buyer" or "seller" from here. Admin is set below, in SQL.
        user_metadata: { role: u.role === "seller" ? "seller" : "buyer" },
      });
      if (error) throw new Error(`createUser ${u.key}: ${error.message}`);
      ids[u.key] = data.user.id;
    }

    // The admin role can only be given with direct database access, never through the API.
    for (const u of users.filter((x) => x.role === "admin")) {
      await db.query("delete from public.buyers where id in (select buyer_id from private.buyer_accounts where user_id = $1)", [ids[u.key]]);
      await db.query("update private.user_roles set role = 'admin' where user_id = $1", [ids[u.key]]);
    }
    const roles = await db.query("select role, count(*)::int n from private.user_roles group by role order by role");
    log("roles:", roles.rows.map((r) => `${r.role}=${r.n}`).join(" "));

    // 3. buyers: the trigger already made a row with a random code; pin code, region and identity
    for (const u of users.filter((x) => x.role === "buyer")) {
      const i = buyerIdentity(u.n);
      const { rows } = await db.query("select buyer_id from private.buyer_accounts where user_id = $1", [ids[u.key]]);
      const buyerId = rows[0].buyer_id;
      await db.query("update public.buyers set code = $2, region = $3 where id = $1", [buyerId, u.code, u.region]);
      await db.query(
        "update private.buyer_identities set company_name = $2, contact_name = $3, phone = $4, address = $5 where buyer_id = $1",
        [buyerId, i.company_name, i.contact_name, i.phone, i.address],
      );
    }

    // 4. sellers: public row, account link, private identity
    const sellerIds = {};
    for (const s of sellers) {
      const i = sellerIdentity(s.n);
      const { rows } = await db.query(
        "insert into public.sellers (code, region, status, verified) values ($1, $2, $3, $4) returning id",
        [s.code, s.region, s.status, s.verified],
      );
      sellerIds[s.n] = rows[0].id;
      await db.query("insert into private.seller_accounts (seller_id, user_id) values ($1, $2)", [rows[0].id, ids[`seller${s.n}`]]);
      await db.query(
        `insert into private.seller_identities (seller_id, legal_name, contact_name, phone, email, address, tax_id, bank_name, iban)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [rows[0].id, i.legal_name, i.contact_name, i.phone, i.email, i.address, i.tax_id, i.bank_name, i.iban],
      );
    }

    // 5. products
    const cats = Object.fromEntries((await db.query("select slug, id from public.categories")).rows.map((r) => [r.slug, r.id]));
    // Listing dates are spread over the past weeks (a fixed shuffle), so "newest first" means something.
    for (const [i, p] of products.entries()) {
      await db.query(
        `insert into public.products (seller_id, category_id, part_number, condition, price_piastres, stock, title_en, title_ar, specs,
                                      description_en, description_ar, unit_en, unit_ar, min_order_qty, lead_days, price_breaks, listed_on)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16::jsonb, current_date - $17::int)`,
        [sellerIds[p.seller], cats[p.cat], p.code, p.condition, p.egp * 100, p.stock, p.en, p.ar, JSON.stringify(p.specs ?? []),
         p.desc_en ?? "", p.desc_ar ?? "", p.unit_en ?? "piece", p.unit_ar ?? "قطعة", p.moq ?? 1, p.lead ?? 3, JSON.stringify(p.breaks ?? []),
         (i * 17) % 41],
      );
    }

    // 5b. one photograph per sample listing. Sources and licences are in scripts/seed-images/credits.json.
    //     Every file goes through the same re-encoding as a supplier's upload.
    if (images && dataset.images) {
      const dir = join(process.cwd(), "scripts", "seed-images");
      const credits = JSON.parse(readFileSync(join(dir, "credits.json"), "utf8"));
      const { reencodePhoto } = await import("../src/lib/photo.ts");
      for (const p of products.filter((x) => x.img)) {
        const c = credits[p.img];
        if (!c) throw new Error(`no credits entry for ${p.img}`);
        const product = (await db.query("select id from public.products where part_number = $1", [p.code])).rows[0];
        const source = readFileSync(join(dir, `${p.img}.jpg`));
        const clean = await reencodePhoto(source);
        // Sample photographs keep the same storage name from one nightly reset to the next (a hash of
        // the file), so image caches stay valid. A supplier's own upload always gets a random name.
        const path = `sample-${createHash("sha1").update(source).digest("hex").slice(0, 20)}.webp`;
        const up = await admin.storage.from("product-images").upload(path, clean.data, { contentType: "image/webp", cacheControl: "31536000" });
        if (up.error) throw new Error(`image upload ${p.img}: ${up.error.message}`);
        await db.query(
          `insert into public.product_images (product_id, path, width, height, kind, credit_title, credit_license, credit_source_url)
           values ($1, $2, $3, $4, 'photo', $5, $6, $7)`,
          [product.id, path, clean.width, clean.height, c.title ?? null, c.licence, c.source_url],
        );
      }
    }

    // 6. sample orders, driven through the real functions so the ledger is consistent
    const asUser = async (key, text, params = []) => {
      await db.query("begin");
      try {
        await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids[key], role: "authenticated" })]);
        const r = await db.query(text, params);
        await db.query("commit");
        return r.rows[0];
      } catch (e) {
        await db.query("rollback");
        throw e;
      }
    };
    const refOf = async (pn) => (await db.query("select ref from public.products where part_number = $1", [pn])).rows[0].ref;
    let eventNo = 1000;
    const pay = async (no) => {
      const { rows } = await db.query("select total_piastres from public.orders where no = $1", [no]);
      await db.query("select public.payment_apply_event('mock', $1, $2, true, $3, $4::jsonb)", [
        `seed-${++eventNo}`, no, rows[0].total_piastres, JSON.stringify({ type: "TRANSACTION", obj: { id: eventNo, order: { merchant_order_id: no } } }),
      ]);
    };
    for (const o of sampleOrders) {
      const no = (await asUser(o.buyer, "select public.buyer_create_order($1, $2) as no", [await refOf(o.code), o.qty])).no;
      if (o.to === "pending_payment") continue;
      await pay(no);
      if (o.to === "paid_held") continue;
      if (o.to === "refunded") {
        await asUser(o.buyer, "select public.buyer_cancel_order($1)", [no]);
        continue;
      }
      const seller = (await db.query("select s.code from public.orders o join public.sellers s on s.id = o.seller_id where o.no = $1", [no])).rows[0].code;
      await asUser(`seller${sellers.find((x) => x.code === seller).n}`, "select public.seller_mark_shipped($1)", [no]);
      if (o.to === "shipped") continue;
      if (o.to === "disputed") {
        await asUser(o.buyer, "select public.buyer_open_dispute($1, $2, $3)", [no, "not_as_described", "Sample note: the size differs from the listing."]);
        continue;
      }
      await asUser(o.buyer, "select public.buyer_confirm_delivery($1)", [no]);
      if (o.to === "paid_out") await asUser("admin", "select public.admin_payout_seller($1)", [sellerIds[sellers.find((x) => x.code === seller).n]]);
    }

    // 7. sample conversations, posted through the real function with the real filter's verdict
    for (const th of sampleThreads) {
      const id = (await asUser(th.buyer, "select public.chat_open_thread($1) as id", [await refOf(th.code)])).id;
      const history = { buyer: [], seller: [] };
      for (const [who, body] of th.messages) {
        const key = who === "buyer" ? th.buyer : th.seller;
        const verdict = checkText(body, history[who]);
        await db.query("select public.chat_post_message($1, $2, $3, $4, $5)", [id, ids[key], body, verdict.verdict, verdict.reasons]);
        history[who].push(body);
      }
    }

    const c = await db.query(
      "select (select count(*) from public.sellers) sellers, (select count(*) from public.products) products, (select count(*) from public.buyers) buyers, (select count(*) from public.orders) orders, (select count(*) from public.messages) messages, (select count(*) from public.product_images) images",
    );
    log(`seeded ${target}:`, c.rows[0], `users: ${users.length}`);
    return { ids, sellerIds };
  } finally {
    await db.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed.mjs")) {
  seed(targetFromArgs()).catch((e) => {
    console.error("seed failed:", e.message);
    process.exit(1);
  });
}
