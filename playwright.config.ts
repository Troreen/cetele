import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    locale: "tr-TR",
    timezoneId: "Europe/Stockholm",
    trace: "retain-on-failure",
  },
  webServer: process.env.CETELE_E2E_EXTERNAL_SERVER === "1" ? undefined : {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
