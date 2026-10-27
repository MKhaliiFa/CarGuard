import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStorageHandle } from './lib/storage'
import { expectNoDetectionClaims, renderWithInspection } from './test/render'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ offlineReady: [false, vi.fn()], needRefresh: [false, vi.fn()], updateServiceWorker: vi.fn() }) }))

const { App } = await import('./App')

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetStorageHandle()
  window.location.hash = '#/workflow'
})

describe('inspection workflow', () => {
  it('starts with no priorities and no detection claims', async () => {
    renderWithInspection(<App />)
    expect(await screen.findByRole('heading', { name: 'خطوات فحص السيارة' })).toBeInTheDocument()
    expect(screen.getByText(/لا توجد ملاحظات مسجلة بعد، لذلك لا توجد أولويات/)).toBeInTheDocument()
    expectNoDetectionClaims(document.body.textContent ?? '')
  })

  it('records a zone observation and surfaces it as a priority', async () => {
    const user = userEvent.setup()
    renderWithInspection(<App />)
    await user.click(screen.getByRole('link', { name: 'الخريطة' }))
    await user.click(await screen.findByRole('button', { name: /منفذ التشخيص OBD-II/ }))

    const zone = document.getElementById('zone-obd')!
    await user.click(within(zone).getByLabelText('تحتاج فحصًا إضافيًا'))
    expect(within(zone).queryByText(/وقت الفحص: —/)).not.toBeInTheDocument()

    await user.click(within(zone).getByText('إضافة ملاحظة مكتوبة'))
    await user.type(within(zone).getByLabelText('ماذا لاحظت؟'), 'وصلة غريبة في المنفذ')
    await user.click(within(zone).getByRole('button', { name: 'إضافة الملاحظة' }))
    expect(within(zone).getByText('وصلة غريبة في المنفذ')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'الخطوات' }))
    const item = await screen.findByRole('heading', { name: /منفذ التشخيص OBD-II/ })
    expect(item.closest('li')).toHaveTextContent('مؤشرات مشتبه بها')
    expect(item.closest('li')).toHaveTextContent('وصلة غريبة في المنفذ')
    expectNoDetectionClaims(document.body.textContent ?? '')
  })

  it('deletes all data after explicit confirmation', async () => {
    const user = userEvent.setup()
    renderWithInspection(<App />)
    await user.click(screen.getByRole('link', { name: 'الخريطة' }))
    await user.click(await screen.findByRole('button', { name: /الشنطة ومكان الإطار الاحتياطي/ }))
    await user.click(within(document.getElementById('zone-trunk-spare')!).getByLabelText('تم الفحص'))
    expect(screen.getByText(/تم فحص 1 من 11/)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'الإعدادات والتوافق' }))
    await user.click(await screen.findByRole('button', { name: 'حذف كل البيانات' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'حذف نهائي' }))
    expect(await screen.findByText('تم حذف كل البيانات من هذا الجهاز.')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'الخريطة' }))
    expect(await screen.findByText(/تم فحص 0 من 11/)).toBeInTheDocument()
  })
})
