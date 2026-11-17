import { defineConfig } from "vitest/config";

// Heavy tests: real Supabase TEST project, one file at a time, 30 s per test.
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.mjs"],
    globalSetup: ["tests/db/global-setup.mjs"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
