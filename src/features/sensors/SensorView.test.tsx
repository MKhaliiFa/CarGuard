import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoDetectionClaims, renderWithInspection } from '../../test/render'
import { SAMPLE_DURATION_MS } from './MagnetometerPanel'
import { SensorView } from './SensorView'

type Win = Window & { Magnetometer?: unknown }

let lastSensor: FakeMagnetometer | undefined

class FakeMagnetometer extends EventTarget {
  x: number | null = null
  y: number | null = null
  z: number | null = null
  started = false
  start() {
    this.started = true
    lastSensor = this as FakeMagnetometer
  }
  stop() {
    this.started = false
  }
  emit(x: number, y: number, z: number) {
    this.x = x
    this.y = y
    this.z = z
    this.dispatchEvent(new Event('reading'))
  }
  fail(name: string) {
    const e = new Event('error') as Event & { error?: unknown }
    e.error = { name }
    this.dispatchEvent(e)
  }
}

afterEach(() => {
  delete (window as Win).Magnetometer
  lastSensor = undefined
})

describe('SensorView', () => {
  it('explains the limitation and shows no readings when the API is missing', () => {
    renderWithInspection(<SensorView />)
    expect(screen.getByText('مستشعر المجال المغناطيسي غير متاح في هذا المتصفح')).toBeInTheDocument()
    expect(screen.queryByText('µT')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'بدائل مدعومة' })).toBeInTheDocument()
    expectNoDetectionClaims(document.body.textContent ?? '')
  })

  it('shows no number until the sensor actually reports', async () => {
    ;(window as Win).Magnetometer = FakeMagnetometer
    renderWithInspection(<SensorView />)
    await userEvent.click(screen.getByRole('button', { name: 'تشغيل المستشعر' }))
    expect(lastSensor?.started).toBe(true)
    expect(screen.getByText(/لن يعرض التطبيق أي رقم قبل وصول قراءة حقيقية/)).toBeInTheDocument()
    expect(document.querySelector('.readout')).toBeNull()

    act(() => lastSensor!.emit(30, 40, 0))
    expect(document.querySelector('.readout')?.textContent).toContain('50.0')
  })

  it('shows a clear message when permission is denied', async () => {
    ;(window as Win).Magnetometer = FakeMagnetometer
    renderWithInspection(<SensorView />)
    await userEvent.click(screen.getByRole('button', { name: 'تشغيل المستشعر' }))
    act(() => lastSensor!.fail('NotAllowedError'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('رفض المتصفح أو النظام إذن'))
    expect(document.querySelector('.readout')).toBeNull()
  })

  it('records a baseline and a zone comparison from real samples only, capped at "suspicious"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    ;(window as Win).Magnetometer = FakeMagnetometer
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithInspection(<SensorView />)
    await user.click(screen.getByRole('button', { name: 'تشغيل المستشعر' }))
    act(() => lastSensor!.emit(30, 0, 0))

    await user.click(screen.getByRole('button', { name: 'تسجيل خط الأساس' }))
    act(() => {
      for (let i = 0; i < 10; i++) lastSensor!.emit(30 + (i % 2) * 0.2, 0, 0)
      vi.advanceTimersByTime(SAMPLE_DURATION_MS)
    })
    expect(await screen.findByText(/تم تسجيل خط الأساس من 10 قراءة/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تسجيل قياس لهذه المنطقة' }))
    act(() => {
      for (let i = 0; i < 10; i++) lastSensor!.emit(200, 0, 0)
      vi.advanceTimersByTime(SAMPLE_DURATION_MS)
    })
    expect(await screen.findByRole('heading', { name: 'القياسات المسجلة' })).toBeInTheDocument()
    expect(screen.getByText(/Δ 169\.9 µT/)).toBeInTheDocument()
    expect(screen.getAllByText('مؤشر مشتبه به').length).toBeGreaterThan(0)
    expect(screen.queryByText('مؤكدة بالمعاينة')).not.toBeInTheDocument()
    expectNoDetectionClaims(document.body.textContent ?? '')
    vi.useRealTimers()
  })

  it('refuses to record a baseline when too few readings arrive', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    ;(window as Win).Magnetometer = FakeMagnetometer
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithInspection(<SensorView />)
    await user.click(screen.getByRole('button', { name: 'تشغيل المستشعر' }))
    act(() => lastSensor!.emit(30, 0, 0))
    await user.click(screen.getByRole('button', { name: 'تسجيل خط الأساس' }))
    act(() => {
      lastSensor!.emit(30, 0, 0)
      vi.advanceTimersByTime(SAMPLE_DURATION_MS)
    })
    expect(await screen.findByText(/لم تصل قراءات كافية/)).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('keeps baseline and zone buttons disabled until real readings arrive', async () => {
    ;(window as Win).Magnetometer = FakeMagnetometer
    renderWithInspection(<SensorView />)
    expect(screen.getByRole('button', { name: 'تسجيل خط الأساس' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'تسجيل قياس لهذه المنطقة' })).toBeDisabled()
  })
})
