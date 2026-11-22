import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    hookTimeout: 30_000, // PGlite boots in beforeAll
    coverage: { provider: "v8", include: ["src/**"], exclude: ["src/server.ts"] },
  },
});
