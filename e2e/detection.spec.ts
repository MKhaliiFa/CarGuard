import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Runs the real self-hosted model against a fake camera under the production CSP.
// Needs DETECTION_FIXTURE (an .mjpeg/.y4m showing a cat); skipped otherwise. See README.
const CSP = /name: Content-Security-Policy\s+value: "([^"]+)"/.exec(readFileSync('render.yaml', 'utf8'))?.[1]

test.skip(!process.env.DETECTION_FIXTURE, 'Set DETECTION_FIXTURE to a fake camera video to run the real model')

test('real model detects an object from the camera under the production CSP', async ({ page }) => {
  test.setTimeout(120_000)
  expect(CSP, 'CSP not found in render.yaml').toBeTruthy()
  const violations: string[] = []
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) violations.push(m.text())
  })
  await page.route('**/*', async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': CSP! } })
  })
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`Content Security Policy violation: ${e.violatedDirective} ${e.blockedURI}`))
  })

  await page.goto('/#/camera')
  await page.getByRole('button', { name: 'تشغيل الكاميرا الخلفية' }).click()
  await page.getByRole('button', { name: 'تشغيل الكشف الحي' }).click()

  const list = page.getByRole('list', { name: 'قائمة الأجسام المكتشفة' })
  await expect(list).toContainText('قطة', { timeout: 90_000 })
  await expect(page.locator('.live-overlay')).toBeVisible()
  await expect(page.getByText(/^(WEBGPU|WEBGL|CPU)$/)).toBeVisible()
  await page.screenshot({ path: `e2e/screenshots/detection-${test.info().project.name}.png`, fullPage: true })

  // long.js (a TF.js dependency) probes WebAssembly inside try/catch and falls back to JS when the CSP
  // blocks it. That single probe is expected; the CSP stays strict (no 'wasm-unsafe-eval').
  expect(violations.filter((v) => !/script-src wasm-eval/.test(v))).toEqual([])
  expect(errors).toEqual([])
})
