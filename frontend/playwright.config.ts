import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5174",
    trace: "on-first-retry",
    ...(process.env.E2E_CHROME_EXECUTABLE
      ? { launchOptions: { executablePath: process.env.E2E_CHROME_EXECUTABLE } }
      : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
