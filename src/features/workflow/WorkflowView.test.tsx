import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '../../components/Toast'
import { resetStorageHandle } from '../../lib/storage'
import { InspectionProvider, useInspection } from '../../state/InspectionContext'
import { expectNoDetectionClaims } from '../../test/render'
import { WorkflowView } from './WorkflowView'

function Ready({ children }: { readonly children: React.ReactNode }) {
  const { ready } = useInspection()
  return ready ? <>{children}</> : null
}

function renderDashboard() {
  return render(
    <InspectionProvider>
      <ToastProvider>
        <Ready>
          <WorkflowView />
        </Ready>
      </ToastProvider>
    </InspectionProvider>,
  )
}

const card = () => screen.getByRole('article')
const stepButton = (n: number) => within(screen.getByRole('list', { name: 'خطوات الرحلة' })).getAllByRole('button')[n - 1]!

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetStorageHandle()
})

describe('dashboard journey', () => {
  it('starts on the preparation step with an honest, empty state', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'خطوات فحص السيارة' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ابدأ فحص السيارة' })).toBeInTheDocument()
    expect(within(card()).getByRole('heading', { name: 'جهّز الفحص' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'نسبة التقدم في الرحلة 0%' })).toBeInTheDocument()
    // jsdom has no Magnetometer: the sensor step must say so instead of waiting for the user.
    expect(stepButton(3)).toHaveAccessibleName(/غير متاحة هنا/)
    expectNoDetectionClaims(document.body.textContent ?? '')
  })

  it('marks a step done, confirms it, and advances to the next open step', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await screen.findByRole('article')
    await user.click(within(card()).getByRole('button', { name: 'تمت هذه الخطوة' }))
    expect(await screen.findByText('تم تعليم الخطوة مكتملة')).toBeInTheDocument()
    expect(within(card()).getByRole('heading', { name: 'افحص المناطق بعينك' })).toBeInTheDocument()
    expect(stepButton(1)).toHaveAccessibleName(/مكتملة/)
    expect(screen.getByRole('button', { name: 'تابع الفحص: الفحص البصري' })).toBeInTheDocument()
  })

  it('skips a step, can undo it, and browses with next/back', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await screen.findByRole('article')
    await user.click(within(card()).getByRole('button', { name: 'تخطي الآن' }))
    expect(stepButton(1)).toHaveAccessibleName(/تم تخطيها/)

    await user.click(screen.getByRole('button', { name: /السابقة/ }))
    expect(within(card()).getByRole('heading', { name: 'جهّز الفحص' })).toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'تراجع عن التعليم' }))
    expect(stepButton(1)).toHaveAccessibleName(/لم تبدأ/)

    await user.click(screen.getByRole('button', { name: /التالية/ }))
    expect(within(card()).getByRole('heading', { name: 'افحص المناطق بعينك' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'الخطوة الحالية' }))
    expect(within(card()).getByRole('heading', { name: 'جهّز الفحص' })).toBeInTheDocument()
  })

  it('resumes an unfinished journey after a reload', async () => {
    const user = userEvent.setup()
    const first = renderDashboard()
    await screen.findByRole('article')
    await user.click(within(card()).getByRole('button', { name: 'تمت هذه الخطوة' }))
    await waitFor(() => expect(within(card()).getByRole('heading', { name: 'افحص المناطق بعينك' })).toBeInTheDocument())
    // Let the save effect's IndexedDB write settle before "reloading".
    await new Promise((r) => setTimeout(r, 50))
    first.unmount()

    resetStorageHandle()
    renderDashboard()
    expect(await screen.findByRole('button', { name: 'تابع الفحص: الفحص البصري' })).toBeInTheDocument()
    expect(stepButton(1)).toHaveAccessibleName(/مكتملة/)
  })
})
