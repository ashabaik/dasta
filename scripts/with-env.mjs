// Runs a command with the Supabase settings of one project taken from .dev.vars.
//   node scripts/with-env.mjs demo next dev
//   node scripts/with-env.mjs test next build
// Secrets stay in .dev.vars; no .env file is written.
import { spawn } from "node:child_process";
import { targetEnv } from "./env.mjs";

const [target, ...cmd] = process.argv.slice(2);
const env = targetEnv(target);
const child = spawn(cmd.join(" "), {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: env.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.publishableKey,
    SUPABASE_SECRET_KEY: env.secretKey,
    DEMO_USER_PASSWORD: env.demoPassword,
  },
});
child.on("exit", (code) => process.exit(code ?? 1));
