// Heavy-run contract (see README "Testing"):
//  - runs only against the TEST Supabase project, never the demo one
//  - takes advisory lock 7421001 on the test database for the whole run (one heavy run at a time)
//  - whole run is capped at 10 minutes
import pg from "pg";
import { targetEnv } from "../../scripts/env.mjs";
import { seed } from "../../scripts/seed.mjs";

const LOCK_ID = 7421001;
const MAX_RUN_MS = 10 * 60 * 1000;
let lockClient;

export async function setup() {
  const env = targetEnv("test");
  if (!env.supabaseUrl || env.supabaseUrl === env.demoSupabaseUrl || env.databaseUrl.includes(new URL(env.demoSupabaseUrl).hostname.split(".")[0])) {
    throw new Error("Refusing to run: the test target points at the demo project.");
  }
  setTimeout(() => {
    console.error("Heavy run exceeded 10 minutes. Stopping.");
    process.exit(1);
  }, MAX_RUN_MS).unref();

  lockClient = new pg.Client({ connectionString: env.databaseUrl.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
  await lockClient.connect();
  const { rows } = await lockClient.query("select pg_try_advisory_lock($1) as ok", [LOCK_ID]);
  if (!rows[0].ok) {
    await lockClient.end();
    throw new Error("Another heavy run is in progress (advisory lock 7421001 is taken). Try again later.");
  }
  await seed("test", { quiet: true });
}

export async function teardown() {
  if (lockClient) {
    await lockClient.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await lockClient.end().catch(() => {});
  }
}
