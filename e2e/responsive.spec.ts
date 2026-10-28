import { expect, test } from '@playwright/test'

const ROUTES = ['workflow', 'checklist', 'camera', 'sensor', 'bluetooth', 'report', 'more']

const skipIntro = () => localStorage.setItem('carguard.introSeen', '1')

test.describe('first launch', () => {
  test('shows the intro once, can be skipped, and stays dismissed after reload', async ({ page }) => {
    await page.goto('/#/workflow')
    const intro = page.getByRole('dialog', { name: 'افحص سيارتك بخطوات واضحة' })
    await expect(intro).toBeVisible()
    await page.getByRole('button', { name: 'تخطي المقدمة' }).click()
    await expect(intro).toBeHidden()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'خطوات فحص السيارة' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

test.describe('with intro dismissed', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(skipIntro)
  })

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

  test('journey: mark a step, progress persists across reload', async ({ page }) => {
    await page.goto('/#/workflow')
    await page.getByRole('article').getByRole('button', { name: 'تمت هذه الخطوة' }).click()
    await expect(page.getByRole('article').getByRole('heading', { name: 'افحص المناطق بعينك' })).toBeVisible()
    // Wait for the write to land in IndexedDB rather than sleeping.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise((resolve) => {
              const open = indexedDB.open('carguard')
              open.onsuccess = () => {
                const req = open.result.transaction('kv', 'readonly').objectStore('kv').get('inspection-state')
                req.onsuccess = () => resolve(req.result?.stepMarks?.prepare ?? null)
              }
            }),
        ),
      )
      .toBe('done')
    await page.reload()
    await expect(page.getByRole('button', { name: 'تابع الفحص: الفحص البصري' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'الخطوة 1: جهّز الفحص — مكتملة' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    // Control: without the IndexedDB record the journey starts over, so the restore above came from storage.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('carguard')
          open.onsuccess = () => {
            const tx = open.result.transaction('kv', 'readwrite')
            tx.objectStore('kv').delete('inspection-state')
            tx.oncomplete = () => {
              open.result.close()
              resolve()
            }
            tx.onerror = () => reject(tx.error)
          }
        }),
    )
    await page.reload()
    await expect(page.getByRole('button', { name: 'ابدأ فحص السيارة' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'الخطوة 1: جهّز الفحص — لم تبدأ' })).toBeVisible()
  })

  test('camera: permission denied shows an honest error and leaves upload available', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })), enumerateDevices: () => Promise.resolve([]) },
      })
    })
    await page.goto('/#/camera')
    await page.getByRole('button', { name: 'تشغيل الكاميرا الخلفية' }).click()
    await expect(page.getByRole('alert')).toContainText('تعذّر تشغيل الكاميرا')
    await expect(page.getByText('رفع صورة من كاميرا الهاتف')).toBeVisible()
  })
})
