import { describe, expect, it, vi } from 'vitest'
import { backendCandidates, prefetchModel, selectBackend } from './detector'
import { COCO_LABELS_AR, arabicLabel } from './labels'
import { MIN_REFERENCE_PX, WEIGHT_UNAVAILABLE, calibrate, cameraKey, estimateSize, pixelSize, type Calibration } from './measure'
import { BOX_COLOR, coverTransform, drawOverlay, hitTest, toScreen, toSource } from './overlay'
import { CONFIRM_HITS, EMPTY_TRACKER, MAX_MISSES, iou, updateTracks, type Detection, type Track } from './tracker'
import { MIN_INTERVAL_MS, POWER_SAVER_INTERVAL_MS, nextInterval } from './useDetectionLoop'

const det = (label: string, x: number, y = 10, w = 50, h = 50, score = 0.8): Detection => ({ label, score, box: [x, y, w, h] })

describe('tracker', () => {
  it('computes IoU', () => {
    expect(iou([0, 0, 10, 10], [0, 0, 10, 10])).toBe(1)
    expect(iou([0, 0, 10, 10], [20, 20, 5, 5])).toBe(0)
    expect(iou([0, 0, 10, 10], [5, 0, 10, 10])).toBeCloseTo(1 / 3)
  })

  it('keeps a stable id for an object that moves a little between frames', () => {
    let s = updateTracks(EMPTY_TRACKER, [det('cup', 10)], 1)
    const id = s.tracks[0]!.id
    for (let i = 1; i <= 4; i++) s = updateTracks(s, [det('cup', 10 + i * 4)], 1 + i)
    expect(s.tracks).toHaveLength(1)
    expect(s.tracks[0]!.id).toBe(id)
    expect(s.tracks[0]!.state).toBe('tracked')
    expect(s.tracks[0]!.hits).toBeGreaterThanOrEqual(CONFIRM_HITS)
  })

  it('gives a new id to an unrelated object and keeps both apart', () => {
    let s = updateTracks(EMPTY_TRACKER, [det('cup', 10)], 1)
    s = updateTracks(s, [det('cup', 12), det('bottle', 300)], 2)
    expect(s.tracks.map((t) => t.id).sort()).toEqual([1, 2])
  })

  it('marks missing tracks as lost, then drops them', () => {
    let s = EMPTY_TRACKER
    for (let i = 0; i < CONFIRM_HITS; i++) s = updateTracks(s, [det('cup', 10)], i)
    s = updateTracks(s, [], 10)
    expect(s.tracks[0]!.state).toBe('lost')
    for (let i = 0; i < MAX_MISSES; i++) s = updateTracks(s, [], 11 + i)
    expect(s.tracks).toHaveLength(0)
  })

  it('drops a one-frame tentative detection quickly', () => {
    let s = updateTracks(EMPTY_TRACKER, [det('cup', 10)], 1)
    s = updateTracks(s, [], 2)
    s = updateTracks(s, [], 3)
    expect(s.tracks).toHaveLength(0)
  })

  it('lets the label change while keeping the id when boxes overlap strongly', () => {
    let s = updateTracks(EMPTY_TRACKER, [det('remote', 10)], 1)
    s = updateTracks(s, [det('cell phone', 11)], 2)
    expect(s.tracks).toHaveLength(1)
    expect(s.tracks[0]!.label).toBe('cell phone')
    expect(s.tracks[0]!.id).toBe(1)
  })

  it('does not mutate the previous state', () => {
    const s1 = updateTracks(EMPTY_TRACKER, [det('cup', 10)], 1)
    const snapshot = JSON.stringify(s1)
    updateTracks(s1, [det('cup', 30)], 2)
    expect(JSON.stringify(s1)).toBe(snapshot)
  })
})

describe('measurement', () => {
  const key = cameraKey('cam1', 1)
  const cal = calibrate([0, 0, 200, 120], 8.56, 'بطاقة', key, 'T') as Calibration

  it('reports pixel size', () => {
    expect(pixelSize([0, 0, 99.6, 40.2])).toEqual({ widthPx: 100, heightPx: 40 })
  })

  it('never estimates centimetres without a calibration', () => {
    expect(estimateSize([0, 0, 100, 50], undefined, key)).toBeUndefined()
  })

  it('estimates size with explicit error bars from a reference', () => {
    const e = estimateSize([0, 0, 100, 50], cal, key)!
    expect(e.widthCm).toBeCloseTo(4.28)
    expect(e.heightCm).toBeCloseTo(2.14)
    expect(e.widthErrCm).toBeGreaterThan(e.widthCm * 0.2)
  })

  it('invalidates the calibration when camera or zoom changes', () => {
    expect(estimateSize([0, 0, 100, 50], cal, cameraKey('cam2', 1))).toBeUndefined()
    expect(estimateSize([0, 0, 100, 50], cal, cameraKey('cam1', 2))).toBeUndefined()
  })

  it('rejects invalid or too-small references', () => {
    expect(calibrate([0, 0, 200, 100], 0, 'x', key, 'T')).toHaveProperty('error')
    expect(calibrate([0, 0, MIN_REFERENCE_PX - 1, 10], 8, 'x', key, 'T')).toHaveProperty('error')
  })

  it('never reports a weight', () => {
    expect(WEIGHT_UNAVAILABLE).toMatch(/غير متاح/)
  })
})

describe('overlay geometry', () => {
  it('maps object-fit cover correctly and inverts it', () => {
    const t = coverTransform(1280, 720, 390, 520)!
    expect(t.scale).toBeCloseTo(520 / 720)
    expect(t.offsetY).toBeCloseTo(0)
    expect(t.offsetX).toBeLessThan(0)
    const [x, y, w] = toScreen([640, 360, 100, 50], t)
    expect(toSource(x, y, t)[0]).toBeCloseTo(640)
    expect(toSource(x, y, t)[1]).toBeCloseTo(360)
    expect(w).toBeCloseTo(100 * t.scale)
  })

  it('returns undefined before the video has dimensions', () => {
    expect(coverTransform(0, 0, 390, 520)).toBeUndefined()
  })

  it('hit-tests the smallest containing box', () => {
    const big = { id: 1, box: [0, 0, 300, 300] } as unknown as Track
    const small = { id: 2, box: [50, 50, 40, 40] } as unknown as Track
    expect(hitTest([big, small], 60, 60)?.id).toBe(2)
    expect(hitTest([big, small], 200, 200)?.id).toBe(1)
    expect(hitTest([big, small], 400, 400)).toBeUndefined()
  })

  it('draws a green box and an Arabic label with confidence', () => {
    const calls: string[] = []
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, prop: string) => (prop in target ? target[prop] : prop === 'measureText' ? () => ({ width: 50 }) : (...args: unknown[]) => calls.push(`${prop}:${args.join(',')}`)),
      set: (target, prop: string, v) => {
        target[prop] = v
        if (prop === 'strokeStyle') calls.push(`strokeStyle=${v}`)
        return true
      },
    }) as unknown as CanvasRenderingContext2D
    const track: Track = { id: 7, label: 'cup', score: 0.87, box: [10, 40, 50, 50], hits: 3, misses: 0, state: 'tracked', lastSeen: 0 }
    drawOverlay(ctx, [track], { scale: 1, offsetX: 0, offsetY: 0 }, 300, 300, 2, undefined)
    expect(calls).toContain(`strokeStyle=${BOX_COLOR}`)
    expect(calls).toContain('strokeRect:10,40,50,50')
    expect(calls.some((c) => c.startsWith('fillText:#7 كوب 87%'))).toBe(true)
  })

  it('keeps the label on screen when the box extends past the cropped frame', () => {
    const calls: string[] = []
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, prop: string) => (prop in target ? target[prop] : prop === 'measureText' ? () => ({ width: 50 }) : (...args: unknown[]) => calls.push(`${prop}:${args.join(',')}`)),
      set: (target, prop: string, v) => ((target[prop] = v), true),
    }) as unknown as CanvasRenderingContext2D
    const track: Track = { id: 1, label: 'cat', score: 0.95, box: [-80, -10, 500, 400], hits: 3, misses: 0, state: 'tracked', lastSeen: 0 }
    drawOverlay(ctx, [track], { scale: 1, offsetX: 0, offsetY: 0 }, 300, 300, 1, undefined)
    // Label is 60 px wide (50 + padding), right-aligned to the canvas edge, top clamped to 0.
    expect(calls).toContain('fillRect:240,0,60,20')
    expect(calls.some((c) => c.startsWith('fillText:#1 قطة 95%,295,3'))).toBe(true)
  })
})

describe('labels', () => {
  it('translates all 80 COCO classes', () => {
    expect(Object.keys(COCO_LABELS_AR)).toHaveLength(80)
    expect(arabicLabel('cell phone')).toBe('هاتف محمول')
  })
  it('falls back to the original class name', () => {
    expect(arabicLabel('gizmo')).toBe('gizmo')
  })
})

describe('detector loading', () => {
  it('prefers WebGPU only when the browser exposes it', () => {
    expect(backendCandidates({ gpu: {} } as unknown as Navigator)).toEqual(['webgpu', 'webgl', 'cpu'])
    expect(backendCandidates({} as Navigator)).toEqual(['webgl', 'cpu'])
  })

  it('falls back to the next backend when one fails', async () => {
    const tf = { setBackend: vi.fn(async (n: string) => { if (n === 'webgpu') throw new Error('no adapter'); return n === 'webgl' }), ready: vi.fn(async () => undefined) }
    expect(await selectBackend(tf, ['webgpu', 'webgl', 'cpu'])).toBe('webgl')
  })

  it('throws when no backend works', async () => {
    const tf = { setBackend: vi.fn(async () => false), ready: vi.fn() }
    await expect(selectBackend(tf, ['webgl', 'cpu'])).rejects.toThrow(/No TensorFlow.js backend/)
  })

  it('prefetches same-origin model files with byte progress', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('model.json')) return new Response(JSON.stringify({ weightsManifest: [{ paths: ['a.bin', 'b.bin', '../evil'] }] }))
      return new Response(new Uint8Array(10), { headers: { 'content-length': '10' } })
    })
    const progress: [number, number | undefined][] = []
    await prefetchModel((l, t) => progress.push([l, t]), fetchFn as unknown as typeof fetch)
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(fetchFn.mock.calls.map((c) => c[0])).not.toContain('/models/ssdlite_mobilenet_v2/../evil')
    expect(progress.at(-1)).toEqual([20, 20])
  })

  it('reports an HTTP failure', async () => {
    const fetchFn = vi.fn(async () => new Response('nope', { status: 404 }))
    await expect(prefetchModel(() => undefined, fetchFn as unknown as typeof fetch)).rejects.toThrow(/404/)
  })
})

describe('inference scheduling', () => {
  it('never runs faster than the minimum interval and backs off on slow devices', () => {
    expect(nextInterval(10, false)).toBe(MIN_INTERVAL_MS)
    expect(nextInterval(400, false)).toBe(600)
    expect(nextInterval(10, true)).toBe(POWER_SAVER_INTERVAL_MS)
  })
})
