import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets a run use its own dev server (e.g. beside one you already have
// open); E2E_CHROME=1 drives the installed Google Chrome instead of the
// downloaded Chromium, which is handy locally.
const port = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...(process.env.E2E_CHROME ? { channel: "chrome" } : {}) },
    },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Smoke tests only exercise public pages; a dummy secret is enough
      AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-test-secret",
      // The course specs need the LMS switched on
      NEXT_PUBLIC_LMS_ENABLED: "true",
    },
  },
});
