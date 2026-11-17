// Resets the sample data of one Supabase project and seeds it again.
//   node scripts/seed.mjs --target test
// Deletes ALL marketplace rows and ALL auth users of that project, then recreates the demo set.
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { targetEnv, targetFromArgs } from "./env.mjs";
import { users, sellers, products, sellerIdentity, buyerIdentity } from "./seed-data.mjs";

export async function seed(target, { quiet = false } = {}) {
  const env = targetEnv(target);
  const log = (...a) => quiet || console.log(...a);
  const admin = createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = new pg.Client({ connectionString: env.databaseUrl.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    // 1. wipe
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

    // 2. users (confirmed directly: the demo never depends on e-mail delivery)
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
    for (const [n, cat, pn, cond, egp, stock, en, ar, specs] of products) {
      await db.query(
        `insert into public.products (seller_id, category_id, part_number, condition, price_piastres, stock, title_en, title_ar, specs)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [sellerIds[n], cats[cat], pn, cond, egp * 100, stock, en, ar, JSON.stringify(specs)],
      );
    }

    const c = await db.query(
      "select (select count(*) from public.sellers) sellers, (select count(*) from public.products) products, (select count(*) from public.buyers) buyers",
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
