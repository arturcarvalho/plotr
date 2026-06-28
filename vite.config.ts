/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ["debian1"],
  },
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["ggsql-wasm"],
  },
  // Scope Vitest to src unit tests so it never picks up the Playwright specs
  // under e2e/ (which are *.spec.ts and import @playwright/test).
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
