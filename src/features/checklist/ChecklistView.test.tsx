import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetStorageHandle } from '../../lib/storage'
import { renderWithInspection, waitForHydration } from '../../test/render'
import { ChecklistView } from './ChecklistView'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetStorageHandle()
})

function mapZone(title: string): Element {
  const t = [...document.querySelectorAll('.vmap-zone title')].find((el) => el.textContent === title)
  if (!t?.parentElement) throw new Error(`map zone not found: ${title}`)
  return t.parentElement
}

describe('vehicle map', () => {
  it('opens a zone from the drawing and reflects its status on the map', async () => {
    const user = userEvent.setup()
    renderWithInspection(<ChecklistView />)
    await screen.findByRole('heading', { name: 'خريطة فحص السيارة' })
    await waitForHydration()

    fireEvent.click(mapZone('الشنطة ومكان الإطار الاحتياطي'))
    const panel = document.getElementById('zone-trunk-spare')!
    expect(panel).toBeInTheDocument()
    expect(mapZone('الشنطة ومكان الإطار الاحتياطي')).toHaveClass('is-selected')

    await user.click(within(panel).getByLabelText('تحتاج فحصًا إضافيًا'))
    expect(mapZone('الشنطة ومكان الإطار الاحتياطي')).toHaveClass('is-needs_followup')
  })

  it('moves to the next zone that still needs a status', async () => {
    const user = userEvent.setup()
    renderWithInspection(<ChecklistView />)
    await waitForHydration()
    await user.click(await screen.findByRole('button', { name: /منفذ التشخيص OBD-II/ }))
    const obd = document.getElementById('zone-obd')!
    await user.click(within(obd).getByLabelText('تم الفحص'))
    await user.click(within(obd).getByRole('button', { name: /المنطقة التالية: المقاعد الأمامية/ }))
    expect(document.getElementById('zone-front-seats')).toBeInTheDocument()
    expect(document.getElementById('zone-obd')).not.toBeInTheDocument()
  })
})
