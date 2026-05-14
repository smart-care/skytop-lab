import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["app/**/*.test.{ts,tsx}", "drizzle/**/*.test.ts"],
  },
  resolve: {
    alias: { "~": new URL("./app/", import.meta.url).pathname },
  },
});
