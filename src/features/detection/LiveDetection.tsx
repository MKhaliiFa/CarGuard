import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Callout } from '../../components/Callout'
import type { DetectionSnapshot, ZoneId } from '../../lib/types'
import { DetectionDetails } from './DetectionDetails'
import { MODEL_NAME, loadCocoDetector, type Detector, type DetectorLoader } from './detector'
import { arabicLabel } from './labels'
import { ManualReviewForm } from './ManualReviewForm'
import { calibrate, cameraKey, estimateSize, pixelSize, type Calibration } from './measure'
import { coverTransform, drawOverlay, hitTest, toSource } from './overlay'
import { TRACK_STATE_LABEL, type Track } from './tracker'
import { useDetectionLoop } from './useDetectionLoop'

export const MODEL_DOWNLOAD_MB = 9

type ModelState =
  | { phase: 'off' }
  | { phase: 'loading'; loaded: number; total?: number }
  | { phase: 'ready'; detector: Detector }
  | { phase: 'error'; message: string }

interface LiveDetectionProps {
  readonly video: ReactNode
  readonly videoRef: RefObject<HTMLVideoElement | null>
  readonly cameraLive: boolean
  readonly deviceId?: string
  readonly zoom?: number
  readonly zoneId: ZoneId
  readonly captureFrame: () => Promise<{ blob: Blob; width: number; height: number } | undefined>
  readonly loader?: DetectorLoader
}

export function LiveDetection({ video, videoRef, cameraLive, deviceId, zoom, zoneId, captureFrame, loader = loadCocoDetector }: LiveDetectionProps) {
  const [model, setModel] = useState<ModelState>({ phase: 'off' })
  const [paused, setPaused] = useState(false)
  const [minScore, setMinScore] = useState(0.5)
  const [powerSaver, setPowerSaver] = useState(false)
  const [selectedId, setSelectedId] = useState<number>()
  const [reviewing, setReviewing] = useState<{ snapshot?: DetectionSnapshot } | undefined>()
  const [calibration, setCalibration] = useState<Calibration>()
  const [message, setMessage] = useState<string>()
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const selectedRef = useRef<number | undefined>(undefined)
  const detectorRef = useRef<Detector | undefined>(undefined)

  const detector = model.phase === 'ready' ? model.detector : undefined
  const running = !!detector && cameraLive && !paused
  const key = cameraKey(deviceId, zoom)

  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  // Free GPU memory when leaving the page.
  useEffect(() => () => detectorRef.current?.dispose(), [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) sizeRef.current = { w: entry.contentRect.width, h: entry.contentRect.height }
    })
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  const draw = useCallback(
    (tracks: readonly Track[]) => {
      const canvas = canvasRef.current
      const v = videoRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !v || !ctx) return
      const { w, h } = sizeRef.current
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const t = coverTransform(v.videoWidth, v.videoHeight, w, h)
      if (t) drawOverlay(ctx, tracks, t, w, h, dpr, selectedRef.current)
    },
    [videoRef],
  )

  const { tracks, stats, loopError, reset } = useDetectionLoop({ detector, videoRef, running, minScore, powerSaver, onFrame: draw, resetKey: deviceId })

  // Clear stale boxes whenever detection stops or the camera changes.
  useEffect(() => {
    if (!running) canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }, [running])
  // Switching camera invalidates every box: adjust state during render (React's recommended pattern).
  const [lastDevice, setLastDevice] = useState(deviceId)
  if (lastDevice !== deviceId) {
    setLastDevice(deviceId)
    setSelectedId(undefined)
  }

  const enable = async () => {
    setModel({ phase: 'loading', loaded: 0 })
    try {
      const d = await loader((loaded, total) => setModel({ phase: 'loading', loaded, total }))
      detectorRef.current = d
      setModel({ phase: 'ready', detector: d })
    } catch (err) {
      console.error('Model load failed', err)
      setModel({
        phase: 'error',
        message: 'تعذّر تحميل نموذج الكشف. تأكد من الاتصال بالإنترنت في أول مرة، أو أن المتصفح يدعم WebGL. بقية التطبيق يعمل بشكل طبيعي.',
      })
    }
  }

  const disable = () => {
    detectorRef.current?.dispose()
    detectorRef.current = undefined
    setModel({ phase: 'off' })
    reset()
    setSelectedId(undefined)
  }

  const onTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = videoRef.current
    const rect = e.currentTarget.getBoundingClientRect()
    const t = v && coverTransform(v.videoWidth, v.videoHeight, rect.width, rect.height)
    if (!t) return
    const [x, y] = toSource(e.clientX - rect.left, e.clientY - rect.top, t)
    const hit = hitTest(tracks, x, y)
    if (hit) setSelectedId(hit.id)
  }

  const selected = tracks.find((t) => t.id === selectedId)
  const estimate = selected ? estimateSize(selected.box, calibration, key) : undefined

  const snapshotOf = (t: Track): DetectionSnapshot => {
    const est = estimateSize(t.box, calibration, key)
    return {
      label: t.label,
      labelAr: arabicLabel(t.label),
      score: t.score,
      trackId: t.id,
      ...pixelSize(t.box),
      estimate: est && calibration ? { ...est, reference: calibration.referenceName } : undefined,
    }
  }

  const progress = model.phase === 'loading' && model.total ? Math.round((model.loaded / model.total) * 100) : undefined

  return (
    <div className="stack">
      <div ref={stageRef} className="live-stage">
        {video}
        <canvas ref={canvasRef} className="live-overlay" onPointerUp={onTap} aria-hidden="true" hidden={!running && tracks.length === 0} />
      </div>

      {cameraLive && model.phase === 'off' && (
        <div className="panel">
          <h3>الكشف الحي عن الأجسام</h3>
          <p className="muted">
            يحدد نموذج ذكاء اصطناعي الأجسام الشائعة في الصورة ويرسم حولها إطارًا أخضر. يعمل بالكامل على جهازك ولا يرسل أي صورة.
            أول تشغيل يحمّل ملفات النموذج من نفس موقع التطبيق، بحجم {MODEL_DOWNLOAD_MB} ميجابايت تقريبًا، ثم تُحفظ للعمل بدون إنترنت.
          </p>
          <p className="faint">النموذج يعرف ٨٠ فئة عامة فقط مثل الهاتف والكوب والحقيبة. لا يعرف أجهزة التتبع أو التسجيل، ولا يمكنه كشفها.</p>
          <button type="button" className="btn btn--primary btn--block" onClick={() => void enable()}>تشغيل الكشف الحي</button>
        </div>
      )}

      {model.phase === 'loading' && (
        <div className="panel" role="status" aria-live="polite">
          <p>جارٍ تحميل نموذج الكشف{progress !== undefined ? ` — ${progress}%` : '…'}</p>
          <progress max={100} value={progress} style={{ width: '100%' }} aria-label="تقدم تحميل النموذج" />
        </div>
      )}

      {model.phase === 'error' && (
        <Callout tone="danger" role="alert" title="تعذّر تشغيل الكشف">
          <p>{model.message}</p>
          <button type="button" className="btn" onClick={() => void enable()}>إعادة المحاولة</button>
        </Callout>
      )}

      {model.phase === 'ready' && (
        <div className="panel">
          <div className="panel-title">
            <h3>الكشف الحي {paused ? '(متوقف مؤقتًا)' : ''}</h3>
            <span className="faint mono">{model.detector.backend.toUpperCase()}</span>
          </div>
          <div className="btn-row" style={{ marginBottom: 'var(--space-3)' }}>
            <button type="button" className="btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? 'استئناف' : 'إيقاف مؤقت'}</button>
            <button type="button" className="btn btn--ghost" onClick={disable}>إيقاف الكشف</button>
            <button type="button" className="btn btn--ghost" onClick={() => setReviewing({})}>مراجعة جسم لم يُكتشف</button>
          </div>
          <div className="field">
            <label htmlFor="min-score">أقل درجة ثقة لعرض الجسم <span className="mono">{Math.round(minScore * 100)}%</span></label>
            <input id="min-score" type="range" min={0.2} max={0.9} step={0.05} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
          </div>
          <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input type="checkbox" checked={powerSaver} onChange={(e) => setPowerSaver(e.target.checked)} />
            وضع توفير الطاقة (تحليل أقل لتقليل سخونة الهاتف)
          </label>
          <dl className="kv" style={{ marginTop: 'var(--space-3)' }}>
            <dt>زمن التحليل</dt>
            <dd>{stats.inferenceMs !== undefined ? `${Math.round(stats.inferenceMs)} ms` : '—'}</dd>
            <dt>تحليلات في الثانية</dt>
            <dd>{stats.inferencesPerSec !== undefined ? stats.inferencesPerSec.toFixed(1) : '—'}</dd>
            <dt>النموذج</dt>
            <dd>{MODEL_NAME}</dd>
          </dl>
          {loopError && <p role="alert" style={{ color: 'var(--c-red)' }}>{loopError}</p>}
        </div>
      )}

      {model.phase === 'ready' && (
        <div className="panel panel--flush">
          <h3 style={{ padding: 'var(--space-4) var(--space-4) 0' }}>الأجسام المكتشفة ({tracks.length})</h3>
          {tracks.length === 0 ? (
            <p className="faint" style={{ padding: '0 var(--space-4) var(--space-4)' }}>لا توجد أجسام فوق درجة الثقة المحددة. عدم ظهور جسم لا يعني عدم وجوده.</p>
          ) : (
            <ul className="list-reset row-list" aria-label="قائمة الأجسام المكتشفة">
              {tracks.map((t) => (
                <li key={t.id}>
                  <button type="button" className="det-row" aria-pressed={t.id === selectedId} onClick={() => setSelectedId(t.id)}>
                    <span className="mono faint">#{t.id}</span>
                    <span>
                      <strong>{arabicLabel(t.label)}</strong>
                      <span className="faint"> · {TRACK_STATE_LABEL[t.state]}</span>
                    </span>
                    <span className="mono">{Math.round(t.score * 100)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && !reviewing && (
        <DetectionDetails
          track={selected}
          estimate={estimate}
          calibration={calibration}
          calibrationValid={!!calibration && calibration.cameraKey === key}
          onCalibrate={(cm, name) => {
            const result = calibrate(selected.box, cm, name, key, new Date().toISOString())
            if ('error' in result) return result.error
            setCalibration(result)
            return undefined
          }}
          onReview={() => setReviewing({ snapshot: snapshotOf(selected) })}
          onClose={() => setSelectedId(undefined)}
        />
      )}

      {reviewing && (
        <ManualReviewForm
          defaultZone={zoneId}
          detection={reviewing.snapshot}
          captureFrame={captureFrame}
          onCancel={() => setReviewing(undefined)}
          onDone={(m) => {
            setReviewing(undefined)
            setMessage(m)
          }}
        />
      )}
      {message && <p role="status">{message}</p>}
    </div>
  )
}
