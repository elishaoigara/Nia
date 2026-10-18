import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: '*.layout.ts', timeout: 30_000,
  // These checks decode real video; avoid decoder starvation on small CI runners.
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4178', screenshot: 'only-on-failure', colorScheme: 'dark', launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {} },
  webServer: { command: 'node node_modules/vite/bin/vite.js --config e2e/layout/vite.config.mjs', cwd: '../..', url: 'http://127.0.0.1:4178', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'small-phone', use: { viewport: { width: 320, height: 640 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'landscape', use: { viewport: { width: 844, height: 390 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
})
