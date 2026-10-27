import { useCallback, useEffect, useRef, useState } from 'react'
import { magnitude } from '../../lib/magnetics'

/** Minimal typing for the Generic Sensor API Magnetometer (not in lib.dom). */
interface MagnetometerSensor extends EventTarget {
  readonly x?: number | null
  readonly y?: number | null
  readonly z?: number | null
  start(): void
  stop(): void
}
type MagnetometerCtor = new (options?: { frequency?: number }) => MagnetometerSensor

export type SensorStatus = 'unsupported' | 'idle' | 'starting' | 'running' | 'error'
export type SensorErrorCode = 'denied' | 'not_readable' | 'insecure' | 'unknown'

export interface MagReading {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly magnitude: number
  readonly t: number
}

export const SENSOR_ERROR_TEXT: Record<SensorErrorCode, string> = {
  denied: 'رفض المتصفح أو النظام إذن الوصول لمستشعر المجال المغناطيسي.',
  not_readable: 'المستشعر موجود في واجهة المتصفح لكن الجهاز لا يرسل قراءات. قد لا يحتوي الجهاز على مستشعر متاح للمتصفح.',
  insecure: 'المستشعرات تعمل فقط عبر اتصال آمن HTTPS.',
  unknown: 'حدث خطأ غير متوقع في المستشعر.',
}

const HISTORY_SIZE = 150
const FREQUENCY_HZ = 10

function getCtor(): MagnetometerCtor | undefined {
  return (window as unknown as { Magnetometer?: MagnetometerCtor }).Magnetometer
}

function mapSensorError(err: unknown): SensorErrorCode {
  const name = (err as { name?: string } | undefined)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied'
  if (name === 'NotReadableError') return 'not_readable'
  if (name === 'SecurityError') return 'insecure'
  return 'unknown'
}

export function useMagnetometer() {
  const supported = typeof window !== 'undefined' && getCtor() !== undefined
  const [status, setStatus] = useState<SensorStatus>(supported ? 'idle' : 'unsupported')
  const [error, setError] = useState<SensorErrorCode>()
  const [latest, setLatest] = useState<MagReading>()
  const [history, setHistory] = useState<readonly number[]>([])
  const sensorRef = useRef<MagnetometerSensor | null>(null)
  const listenersRef = useRef(new Set<(m: number) => void>())

  const stop = useCallback(() => {
    sensorRef.current?.stop()
    sensorRef.current = null
    setStatus((s) => (s === 'unsupported' ? s : 'idle'))
  }, [])

  const start = useCallback(async () => {
    const Ctor = getCtor()
    if (!Ctor) return
    setError(undefined)
    setStatus('starting')
    try {
      const perm = await navigator.permissions?.query({ name: 'magnetometer' as PermissionName }).catch(() => undefined)
      if (perm?.state === 'denied') throw Object.assign(new Error('denied'), { name: 'NotAllowedError' })
      const sensor = new Ctor({ frequency: FREQUENCY_HZ })
      sensor.addEventListener('reading', () => {
        const { x, y, z } = sensor
        if (x == null || y == null || z == null) return
        const m = magnitude(x, y, z)
        setLatest({ x, y, z, magnitude: m, t: Date.now() })
        setHistory((h) => [...h.slice(-(HISTORY_SIZE - 1)), m])
        setStatus('running')
        listenersRef.current.forEach((fn) => fn(m))
      })
      sensor.addEventListener('error', (e) => {
        setError(mapSensorError((e as Event & { error?: unknown }).error))
        setStatus('error')
        sensor.stop()
      })
      sensor.start()
      sensorRef.current = sensor
    } catch (err) {
      setError(mapSensorError(err))
      setStatus('error')
    }
  }, [])

  /** Collects real readings for `durationMs`. Resolves with only what the sensor actually reported. */
  const sample = useCallback((durationMs: number): Promise<number[]> => {
    return new Promise((resolve) => {
      const values: number[] = []
      const fn = (m: number) => values.push(m)
      listenersRef.current.add(fn)
      window.setTimeout(() => {
        listenersRef.current.delete(fn)
        resolve(values)
      }, durationMs)
    })
  }, [])

  useEffect(() => () => sensorRef.current?.stop(), [])

  return { supported, status, error, latest, history, start, stop, sample }
}
