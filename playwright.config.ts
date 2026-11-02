import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Smoke tests only exercise public pages; a dummy secret is enough
      AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-test-secret",
      MONGODB_URI:
        process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/setups-works-e2e",
    },
  },
});
