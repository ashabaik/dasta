// Applies supabase/migrations/*.sql in name order, once each, using the database URL.
//   node scripts/migrate.mjs --target test
import pg from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { targetEnv, targetFromArgs } from "./env.mjs";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");
const env = targetEnv(targetFromArgs());
const client = new pg.Client({ connectionString: env.databaseUrl.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const has = await client.query("select to_regclass('private.schema_migrations') as t");
  const done = new Set();
  if (has.rows[0].t) {
    for (const r of (await client.query("select name from private.schema_migrations")).rows) done.add(r.name);
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) {
      console.log(`skip   ${f}`);
      continue;
    }
    const sql = readFileSync(join(dir, f), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into private.schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log(`apply  ${f}`);
    } catch (e) {
      await client.query("rollback");
      console.error(`FAILED ${f}: ${e.message}${e.position ? ` (at character ${e.position})` : ""}`);
      process.exitCode = 1;
      break;
    }
  }
  // PostgREST caches the schema; ask it to reload.
  await client.query("notify pgrst, 'reload schema'");
  console.log(`target: ${env.target}`);
} finally {
  await client.end();
}
