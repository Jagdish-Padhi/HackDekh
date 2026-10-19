import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: "./tests/setup.ts",
    hookTimeout: 120000,
    testTimeout: 60000,
    exclude: ["dist/**", "node_modules/**"],
  },
});
