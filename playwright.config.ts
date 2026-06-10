import { defineConfig, devices } from "@playwright/test";

// E2E tests live in e2e/*.spec.ts and run against the Vite dev server. Locally
// the running :5173 server is reused (so it never gets killed); CI starts its
// own. Unit tests (Vitest) are scoped to src/ in vite.config.ts, so the two
// runners never overlap.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    // the GGSQL "Copy" test reads the clipboard
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
