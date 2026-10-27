import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithInspection } from '../../test/render'
import { ReportView } from './ReportView'

let created: Blob[] = []

beforeEach(() => {
  created = []
  URL.createObjectURL = vi.fn((b: Blob) => {
    created.push(b)
    return 'blob:test'
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})
afterEach(() => vi.restoreAllMocks())

describe('ReportView', () => {
  it('asks before exporting and does nothing on cancel', async () => {
    const user = userEvent.setup()
    renderWithInspection(<ReportView />)
    await user.click(screen.getByRole('button', { name: 'تقرير قابل للقراءة' }))
    const dialog = screen.getByRole('dialog', { name: 'تأكيد التصدير' })
    await user.click(within(dialog).getByRole('button', { name: 'إلغاء' }))
    expect(created).toHaveLength(0)
  })

  it('creates a local HTML report after confirmation', async () => {
    const user = userEvent.setup()
    renderWithInspection(<ReportView />)
    await user.click(screen.getByRole('button', { name: 'تقرير قابل للقراءة' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'إنشاء الملف' }))
    expect(await screen.findByText(/تم إنشاء الملف على جهازك/)).toBeInTheDocument()
    expect(created[0]!.type).toContain('text/html')
  })

  it('creates a JSON export after confirmation', async () => {
    const user = userEvent.setup()
    renderWithInspection(<ReportView />)
    await user.click(screen.getByRole('button', { name: 'نسخة بيانات JSON' }))
    expect(screen.getByText('نسخة البيانات لا تتضمن الصور.')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'إنشاء الملف' }))
    expect(created[0]!.type).toContain('application/json')
  })
})
