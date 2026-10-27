import { act, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { resetStorageHandle } from '../../lib/storage'
import { expectNoDetectionClaims, renderWithInspection } from '../../test/render'
import { useInspection } from '../../state/InspectionContext'
import type { Detection } from './tracker'
import type { Detector, DetectorLoader } from './detector'
import { LiveDetection } from './LiveDetection'

/** Test double for the model: returns scripted detections. Never used in production code. */
function scriptedDetector(frames: Detection[][]): Detector & { disposed: boolean; calls: number } {
  const d = {
    backend: 'webgl' as const,
    disposed: false,
    calls: 0,
    async detect() {
      const out = frames[Math.min(d.calls, frames.length - 1)] ?? []
      d.calls++
      return out
    },
    dispose() {
      d.disposed = true
    },
  }
  return d
}

function fakeVideo(): HTMLVideoElement {
  const v = document.createElement('video')
  Object.defineProperties(v, { readyState: { value: 4 }, videoWidth: { value: 640 }, videoHeight: { value: 480 } })
  return v
}

const seen: { observations: readonly unknown[] } = { observations: [] }
function Spy() {
  const { observations } = useInspection().state
  useEffect(() => {
    seen.observations = observations
  }, [observations])
  return null
}

function setup(loader: DetectorLoader, cameraLive = true) {
  const video = fakeVideo()
  const videoRef = { current: video }
  const capture = vi.fn(async () => ({ blob: new Blob(['x'], { type: 'image/jpeg' }), width: 640, height: 480 }))
  const utils = renderWithInspection(
    <>
      <LiveDetection video={<div />} videoRef={videoRef} cameraLive={cameraLive} deviceId="cam1" zoom={1} zoneId="obd" captureFrame={capture} loader={loader} />
      <Spy />
    </>,
  )
  return { ...utils, capture }
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetStorageHandle()
  seen.observations = []
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number)
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})
afterEach(() => vi.unstubAllGlobals())

const cup: Detection = { label: 'cup', score: 0.87, box: [100, 100, 120, 80] }
const phone: Detection = { label: 'cell phone', score: 0.62, box: [300, 200, 60, 110] }

describe('LiveDetection', () => {
  it('does nothing until the user opts in, and discloses the model download', () => {
    const loader = vi.fn()
    setup(loader)
    expect(loader).not.toHaveBeenCalled()
    expect(screen.getByText(/ميجابايت/)).toBeInTheDocument()
    expect(screen.getByText(/لا يعرف أجهزة التتبع أو التسجيل/)).toBeInTheDocument()
  })

  it('shows loading progress, then the backend once ready', async () => {
    let finish: (d: Detector) => void = () => undefined
    const loader: DetectorLoader = (onProgress) =>
      new Promise((resolve) => {
        onProgress(50, 200)
        finish = resolve
      })
    setup(loader)
    await userEvent.click(screen.getByRole('button', { name: 'تشغيل الكشف الحي' }))
    expect(screen.getByRole('status')).toHaveTextContent('25%')
    await act(async () => finish(scriptedDetector([[]])))
    expect(await screen.findByText('WEBGL')).toBeInTheDocument()
  })

  it('shows an understandable error when the model fails to load, with retry', async () => {
    setup(() => Promise.reject(new Error('404')))
    await userEvent.click(screen.getByRole('button', { name: 'تشغيل الكشف الحي' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل نموذج الكشف')
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })

  it('lists real detector output with Arabic labels, confidence and stable ids', async () => {
    const d = scriptedDetector([[cup, phone]])
    setup(async () => d)
    await userEvent.click(screen.getByRole('button', { name: 'تشغيل الكشف الحي' }))
    const list = await screen.findByRole('list', { name: 'قائمة الأجسام المكتشفة' })
    expect(within(list).getByText('كوب')).toBeInTheDocument()
    expect(within(list).getByText('87%')).toBeInTheDocument()
    expect(within(list).getByText('هاتف محمول')).toBeInTheDocument()
    expect(within(list).getByText('#1')).toBeInTheDocument()
    expectNoDetectionClaims(document.body.textContent ?? '')
  })

  it('shows no detections when the model returns none', async () => {
    setup(async () => scriptedDetector([[]]))
    await userEvent.click(screen.getByRole('button', { name: 'تشغيل الكشف الحي' }))
    expect(await screen.findByText(/عدم ظهور جسم لا يعني عدم وجوده/)).toBeInTheDocument()
  })

  it('shows pixel size, no centimetres before calibration, weight unavailable, then a calibrated estimate', async () => {
    const user = userEvent.setup()
    setup(async () => scriptedDetector([[cup]]))
    await user.click(screen.getByRole('button', { name: 'تشغيل الكشف الحي' }))
    await user.click(await screen.findByRole('button', { name: /كوب/ }))
    const panel = screen.getByRole('region', { name: 'تفاصيل الجسم المحدد' })
    expect(within(panel).getByText('120 × 80 px')).toBeInTheDocument()
    expect(within(panel).getByText('غير متاحة بدون معايرة')).toBeInTheDocument()
    expect(within(panel).getByText(/غير متاح — لا يمكن قياس الوزن/)).toBeInTheDocument()

    await user.click(within(panel).getByText('استخدام هذا الجسم كمرجع للقياس'))
    await user.click(within(panel).getByRole('button', { name: 'معايرة' }))
    expect(within(panel).getByText(/8.6 ± .* cm/)).toBeInTheDocument()
  })

  it('saves a manual review with detection metadata only after confirmation', async () => {
    const user = userEvent.setup()
    const { capture } = setup(async () => scriptedDetector([[phone]]))
    await user.click(screen.getByRole('button', { name: 'تشغيل الكشف الحي' }))
    await user.click(await screen.findByRole('button', { name: /هاتف محمول/ }))
    await user.click(screen.getByRole('button', { name: 'تعليم للمراجعة اليدوية' }))
    const form = screen.getByRole('region', { name: 'مراجعة يدوية' })
    await user.type(within(form).getByLabelText('المكان الدقيق داخل المنطقة'), 'خلف غطاء الفيوزات')
    await user.click(within(form).getByLabelText('عليه ضوء صغير أو مؤشر يومض'))
    await user.click(within(form).getByRole('button', { name: 'حفظ المراجعة' }))
    expect(capture).not.toHaveBeenCalled()
    expect(seen.observations).toHaveLength(0)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'حفظ' }))
    expect(await screen.findByText('تم حفظ المراجعة اليدوية على هذا الجهاز.')).toBeInTheDocument()
    expect(capture).toHaveBeenCalledTimes(1)
    expect(seen.observations).toHaveLength(1)
    expect(seen.observations[0]).toMatchObject({
      source: 'user',
      classification: 'suspicious',
      zoneId: 'obd',
      detection: { label: 'cell phone', labelAr: 'هاتف محمول', widthPx: 60, heightPx: 110 },
      review: { location: 'خلف غطاء الفيوزات', checks: ['عليه ضوء صغير أو مؤشر يومض'] },
    })
  })

  it('stops inference when paused and disposes the model when turned off or unmounted', async () => {
    const user = userEvent.setup()
    const d = scriptedDetector([[cup]])
    const { unmount } = setup(async () => d)
    await user.click(screen.getByRole('button', { name: 'تشغيل الكشف الحي' }))
    await screen.findByRole('list', { name: 'قائمة الأجسام المكتشفة' })
    await user.click(screen.getByRole('button', { name: 'إيقاف مؤقت' }))
    const callsAtPause = d.calls
    await act(() => new Promise((r) => setTimeout(r, 300)))
    expect(d.calls).toBe(callsAtPause)
    unmount()
    expect(d.disposed).toBe(true)
  })

  it('does not run inference while the camera is off', async () => {
    const d = scriptedDetector([[cup]])
    setup(async () => d, false)
    expect(screen.queryByRole('button', { name: 'تشغيل الكشف الحي' })).not.toBeInTheDocument()
    await act(() => new Promise((r) => setTimeout(r, 100)))
    expect(d.calls).toBe(0)
  })
})
