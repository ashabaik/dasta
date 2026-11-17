import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { targetEnv } from "../../scripts/env.mjs";
import { EMAIL_DOMAIN, sellers, sellerCanaries } from "../../scripts/seed-data.mjs";

export const env = targetEnv("test");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

/** Not signed in: what any visitor's browser can do. */
export function anon() {
  return createClient(env.supabaseUrl, env.publishableKey, opts);
}

/** Signed in as one of the seeded users, e.g. "buyer1", "seller2", "admin". */
export async function as(key) {
  const c = createClient(env.supabaseUrl, env.publishableKey, opts);
  const { error } = await c.auth.signInWithPassword({ email: `${key}@${EMAIL_DOMAIN}`, password: env.demoPassword });
  if (error) throw new Error(`sign in ${key}: ${error.message}`);
  return c;
}

/** Server client with the secret key (bypasses RLS). Used only to set up or inspect. */
export function service() {
  return createClient(env.supabaseUrl, env.secretKey, opts);
}

/** Direct database connection (owner). Used only to set up or inspect. */
export async function sql(text, params = []) {
  const c = new pg.Client({ connectionString: env.databaseUrl.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    return (await c.query(text, params)).rows;
  } finally {
    await c.end();
  }
}

export async function sellerIdByCode(code) {
  const rows = await sql("select id from public.sellers where code = $1", [code]);
  return rows[0]?.id;
}

/** Every marker of every seeded seller, except the sellers listed in `own`. */
export function canariesExcept(own = []) {
  return sellers.filter((s) => !own.includes(s.n)).flatMap((s) => sellerCanaries(s.n));
}

/** Markers of buyers' private data and of every account e-mail. */
export const BUYER_CANARIES = ["MKPRIVB", "000 000 02", `buyer1@${EMAIL_DOMAIN}`, `buyer2@${EMAIL_DOMAIN}`, `admin@${EMAIL_DOMAIN}`];

/** Returns the markers found in any JSON-serialisable value. */
export function findCanaries(value, canaries) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  const lower = text.toLowerCase();
  const compact = lower.replace(/[\s\-+()]/g, "");
  return canaries.filter((c) => lower.includes(c.toLowerCase()) || compact.includes(c.toLowerCase().replace(/[\s\-+()]/g, "")));
}
