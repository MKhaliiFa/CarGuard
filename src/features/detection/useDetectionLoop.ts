import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { Detector } from './detector'
import { EMPTY_TRACKER, updateTracks, type Track, type TrackerState } from './tracker'

/** Never infer more often than this, even on fast devices (≈8 inferences/s). */
export const MIN_INTERVAL_MS = 120
/** Power-saver: about two inferences per second. */
export const POWER_SAVER_INTERVAL_MS = 500
/** Leave headroom: wait 1.5× the last inference time before the next one so the GPU can cool. */
export const BUSY_FACTOR = 1.5

export function nextInterval(lastInferenceMs: number, powerSaver: boolean): number {
  return Math.max(powerSaver ? POWER_SAVER_INTERVAL_MS : MIN_INTERVAL_MS, lastInferenceMs * BUSY_FACTOR)
}

export interface LoopStats {
  readonly inferenceMs?: number
  readonly inferencesPerSec?: number
  readonly count: number
}

interface LoopOptions {
  readonly detector: Detector | undefined
  readonly videoRef: RefObject<HTMLVideoElement | null>
  readonly running: boolean
  readonly minScore: number
  readonly powerSaver: boolean
  /** Called every animation frame with the latest tracks, for drawing. */
  readonly onFrame: (tracks: readonly Track[]) => void
  /** Changing this (e.g. camera id) drops all tracks. */
  readonly resetKey?: string
}

export function useDetectionLoop({ detector, videoRef, running, minScore, powerSaver, onFrame, resetKey }: LoopOptions) {
  const [tracks, setTracks] = useState<readonly Track[]>([])
  const [stats, setStats] = useState<LoopStats>({ count: 0 })
  const [loopError, setLoopError] = useState<string>()
  const tracker = useRef<TrackerState>(EMPTY_TRACKER)
  const settings = useRef({ minScore, powerSaver, onFrame })

  useEffect(() => {
    settings.current = { minScore, powerSaver, onFrame }
  }, [minScore, powerSaver, onFrame])

  const [lastKey, setLastKey] = useState(resetKey)
  if (lastKey !== resetKey) {
    setLastKey(resetKey)
    setTracks([])
  }

  const reset = useCallback(() => {
    tracker.current = EMPTY_TRACKER
    setTracks([])
  }, [])

  useEffect(() => {
    tracker.current = EMPTY_TRACKER
  }, [resetKey])

  useEffect(() => {
    if (!detector || !running) return
    let raf = 0
    let cancelled = false
    let inFlight = false
    let lastStart = 0
    let lastMs = 0
    let count = 0
    const started = performance.now()

    const tick = (now: number) => {
      if (cancelled) return
      settings.current.onFrame(tracker.current.tracks)
      const video = videoRef.current
      const ready = video && video.readyState >= 2 && video.videoWidth > 0 && document.visibilityState === 'visible'
      if (ready && !inFlight && now - lastStart >= nextInterval(lastMs, settings.current.powerSaver)) {
        inFlight = true
        lastStart = now
        detector
          .detect(video, settings.current.minScore)
          .then((dets) => {
            if (cancelled) return
            lastMs = performance.now() - lastStart
            count++
            tracker.current = updateTracks(tracker.current, dets, Date.now())
            setTracks(tracker.current.tracks)
            setStats({ inferenceMs: lastMs, inferencesPerSec: count / ((performance.now() - started) / 1000), count })
          })
          .catch((err: unknown) => {
            console.error('Inference failed', err)
            if (!cancelled) setLoopError('تعذّر تشغيل النموذج على هذه الصورة. جرّب إيقاف الكشف وتشغيله مرة أخرى.')
          })
          .finally(() => {
            inFlight = false
          })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [detector, running, videoRef])

  return { tracks, stats, loopError, reset }
}
