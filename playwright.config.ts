import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', locale: 'ar-EG' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true },
  projects: [
    // iPhone 12 viewport. Rendered with Chromium: this checks layout, not Safari behaviour.
    { name: 'iphone-12', use: { ...devices['iPhone 12'], browserName: 'chromium', channel: process.env.PW_CHANNEL } },
    // Approximation of OPPO Reno12 F (1080×2412 @ ~2.625 DPR).
    { name: 'android-reno12f', use: { browserName: 'chromium', channel: process.env.PW_CHANNEL, viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; CPH2637) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' } },
    { name: 'small-320', use: { browserName: 'chromium', channel: process.env.PW_CHANNEL, viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true } },
  ],
})
