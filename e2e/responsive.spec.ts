import { expect, test } from '@playwright/test'

const ROUTES = ['workflow', 'checklist', 'camera', 'sensor', 'bluetooth', 'report', 'more']

for (const route of ROUTES) {
  test(`${route}: renders RTL with no horizontal overflow`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`/#/${route}`)
    await expect(page.locator('h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `e2e/screenshots/${info.project.name}-${route}.png`, fullPage: true })
    expect(errors).toEqual([])
  })
}

test('checklist zone expands and records status', async ({ page }) => {
  await page.goto('/#/checklist')
  await page.getByRole('button', { name: /منفذ التشخيص OBD-II/ }).click()
  await page.locator('#zone-obd').getByLabel('تحتاج فحصًا إضافيًا').check()
  await expect(page.locator('#zone-obd')).not.toContainText('وقت الفحص: —')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.reload()
  await page.getByRole('button', { name: /منفذ التشخيص OBD-II/ }).click()
  await expect(page.locator('#zone-obd input[value="needs_followup"]')).toBeChecked()
})

test('sensor and bluetooth pages show honest fallbacks in a browser without those APIs', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).Magnetometer
    Object.defineProperty(navigator, 'bluetooth', { value: undefined })
  })
  await page.goto('/#/sensor')
  await expect(page.getByText('مستشعر المجال المغناطيسي غير متاح في هذا المتصفح')).toBeVisible()
  await expect(page.locator('.readout')).toHaveCount(0)
  await page.goto('/#/bluetooth')
  await expect(page.getByText('البلوتوث من المتصفح غير مدعوم هنا')).toBeVisible()
  await expect(page.getByText(/dBm/)).toHaveCount(0)
})
