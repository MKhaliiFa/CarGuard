import { useCallback, useEffect, useRef, useState } from 'react'

type CompassStatus = 'unsupported' | 'idle' | 'running' | 'denied' | 'no_data'

interface OrientationCtor {
  requestPermission?: () => Promise<PermissionState>
}

const WINDOW_SIZE = 30

/** Smallest arc (degrees) covering all headings — handles the 359°→0° wrap. */
export function headingSpread(headings: readonly number[]): number {
  if (headings.length < 2) return 0
  const sorted = [...headings].map((h) => ((h % 360) + 360) % 360).sort((a, b) => a - b)
  let maxGap = 360 - (sorted[sorted.length - 1]! - sorted[0]!)
  for (let i = 1; i < sorted.length; i++) maxGap = Math.max(maxGap, sorted[i]! - sorted[i - 1]!)
  return 360 - maxGap
}

/**
 * Indirect fallback when no magnetometer API exists: the OS compass heading is derived from the
 * magnetometer, so a sudden swing while the phone is held still can hint at a local magnetic disturbance.
 */
export function useCompassHeading() {
  const ctor = typeof window !== 'undefined' ? (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent : undefined
  const [status, setStatus] = useState<CompassStatus>(ctor ? 'idle' : 'unsupported')
  const [heading, setHeading] = useState<number>()
  const [recent, setRecent] = useState<readonly number[]>([])
  const cleanupRef = useRef<() => void>(undefined)

  const stop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = undefined
    setStatus((s) => (s === 'running' || s === 'no_data' ? 'idle' : s))
  }, [])

  const start = useCallback(async () => {
    if (!ctor) return
    if (typeof ctor.requestPermission === 'function') {
      const result = await ctor.requestPermission().catch(() => 'denied' as PermissionState)
      if (result !== 'granted') return setStatus('denied')
    }
    const onEvent = (e: DeviceOrientationEvent) => {
      const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      const value = typeof ios === 'number' ? ios : e.absolute && e.alpha != null ? (360 - e.alpha) % 360 : undefined
      if (value === undefined) return
      setHeading(value)
      setRecent((r) => [...r.slice(-(WINDOW_SIZE - 1)), value])
      setStatus('running')
    }
    const absEvent = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(absEvent, onEvent as EventListener)
    cleanupRef.current = () => window.removeEventListener(absEvent, onEvent as EventListener)
    setStatus('no_data')
  }, [ctor])

  useEffect(() => () => cleanupRef.current?.(), [])

  return { status, heading, spread: headingSpread(recent), start, stop }
}
