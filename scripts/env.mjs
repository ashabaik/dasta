// Loads secrets from .dev.vars (never committed) and picks the demo or the test project.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadVars() {
  const file = join(root, ".dev.vars");
  const out = { ...process.env };
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i > 0 && !line.startsWith("#")) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return out;
}

/** target: "demo" | "test". Returns the settings of that Supabase project. */
export function targetEnv(target) {
  if (target !== "demo" && target !== "test") throw new Error('target must be "demo" or "test"');
  const v = loadVars();
  const p = target === "test" ? "TEST_" : "";
  const need = (k) => {
    if (!v[p + k]) throw new Error(`missing ${p + k} in .dev.vars`);
    return v[p + k];
  };
  return {
    target,
    databaseUrl: need("DATABASE_URL"),
    supabaseUrl: need("SUPABASE_URL"),
    publishableKey: need("SUPABASE_PUBLISHABLE_KEY"),
    secretKey: need("SUPABASE_SECRET_KEY"),
    demoPassword: need("DEMO_USER_PASSWORD"),
    paymentHmacSecret: need("PAYMENT_HMAC_SECRET"),
    cronSecret: need("CRON_SECRET"),
    demoSupabaseUrl: v.SUPABASE_URL,
  };
}

export function targetFromArgs() {
  const i = process.argv.indexOf("--target");
  const t = i > 0 ? process.argv[i + 1] : undefined;
  if (!t) throw new Error("pass --target demo or --target test");
  return t;
}
