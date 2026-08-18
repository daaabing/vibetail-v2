import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // All tests share one local Supabase database: reset/seed once, run serially.
    fileParallelism: false,
    globalSetup: ["./test/global-db-setup.ts"],
    include: ["apps/**/*.integration.test.ts", "packages/**/*.integration.test.ts"],
    passWithNoTests: false,
  },
});
