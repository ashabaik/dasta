import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Light tests: pure logic, no network.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/unit/**/*.test.ts"], testTimeout: 5_000 },
});
