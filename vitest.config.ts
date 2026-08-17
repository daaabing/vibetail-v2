import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
    },
    environment: "node",
    exclude: ["**/*.integration.test.ts", "**/node_modules/**", "**/dist/**", "**/.build/**"],
    // All tests share one local Supabase database: reset/seed once, run serially.
    fileParallelism: false,
    globalSetup: ["./test/global-db-setup.ts"],
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    passWithNoTests: false,
  },
});
