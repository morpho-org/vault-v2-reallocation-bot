import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 45_000,
    globalSetup: "vitest.setup.ts",
  },
});
