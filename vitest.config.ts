import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@engine": new URL("./src/engine", import.meta.url).pathname,
    },
  },
});
