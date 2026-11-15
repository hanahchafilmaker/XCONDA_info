import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts/ui",
  outputDir: "./.playwright-results",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    locale: "ko-KR",
    // Exercise the human UI, not the deliberate HeadlessChrome crawler fallback.
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH ? {
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--disable-gpu", "--no-zygote"],
    } : undefined,
  },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173/dev.html",
    reuseExistingServer: !process.env.CI,
  },
});
