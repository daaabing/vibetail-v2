import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
    },
    environment: "node",
    exclude: ["**/*.integration.test.ts", "**/node_modules/**", "**/dist/**", "**/.build/**"],
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    passWithNoTests: false,
  },
});
