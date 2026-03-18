import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 120_000,
    globalSetup: "vitest.setup.ts",
  },
});
