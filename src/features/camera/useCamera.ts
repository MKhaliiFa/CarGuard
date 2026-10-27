import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'idle' | 'starting' | 'live' | 'error' | 'unsupported'

export type CameraErrorCode = 'denied' | 'not_found' | 'in_use' | 'insecure' | 'unknown'

export interface ZoomRange {
  readonly min: number
  readonly max: number
  readonly step: number
}

interface ExtendedCapabilities extends MediaTrackCapabilities {
  torch?: boolean
  zoom?: { min: number; max: number; step?: number }
}

export const CAMERA_ERROR_TEXT: Record<CameraErrorCode, string> = {
  denied: 'تم رفض إذن الكاميرا. يمكنك السماح به من إعدادات المتصفح لهذا الموقع، أو استخدام خيار رفع صورة من الكاميرا الأصلية بالأسفل.',
  not_found: 'لم يتم العثور على كاميرا في هذا الجهاز.',
  in_use: 'الكاميرا مستخدمة من تطبيق آخر. أغلقه ثم حاول مجددًا.',
  insecure: 'الكاميرا تعمل فقط عبر اتصال آمن HTTPS.',
  unknown: 'تعذّر تشغيل الكاميرا. جرّب مرة أخرى أو استخدم خيار رفع صورة.',
}

export function mapCameraError(err: unknown): CameraErrorCode {
  const name = err instanceof DOMException || err instanceof Error ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'not_found'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'in_use'
    case 'SecurityError':
      return 'insecure'
    default:
      return 'unknown'
  }
}

export function useCamera() {
  const supported = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
  const [status, setStatus] = useState<CameraStatus>(supported ? 'idle' : 'unsupported')
  const [error, setError] = useState<CameraErrorCode>()
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [zoomRange, setZoomRange] = useState<ZoomRange>()
  const [zoom, setZoomState] = useState<number>()
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const track = () => streamRef.current?.getVideoTracks()[0]

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setTorchOn(false)
    setStatus((s) => (s === 'unsupported' ? s : 'idle'))
  }, [])

  const start = useCallback(async () => {
    if (!supported) return
    if (!window.isSecureContext) {
      setError('insecure')
      setStatus('error')
      return
    }
    setStatus('starting')
    setError(undefined)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
      const caps = (stream.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as ExtendedCapabilities
      setTorchAvailable(caps.torch === true)
      if (caps.zoom && caps.zoom.max > caps.zoom.min) {
        setZoomRange({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step ?? 0.1 })
        setZoomState(caps.zoom.min)
      } else {
        setZoomRange(undefined)
      }
      setStatus('live')
    } catch (err) {
      setError(mapCameraError(err))
      setStatus('error')
    }
  }, [supported])

  const setTorch = useCallback(async (on: boolean) => {
    const t = track()
    if (!t) return
    try {
      await t.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
      setTorchOn(on)
    } catch {
      setTorchAvailable(false)
    }
  }, [])

  const setZoom = useCallback(async (value: number) => {
    const t = track()
    if (!t) return
    try {
      await t.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] })
      setZoomState(value)
    } catch {
      setZoomRange(undefined)
    }
  }, [])

  const capture = useCallback(async (): Promise<{ blob: Blob; width: number; height: number } | undefined> => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return undefined
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ? { blob, width: canvas.width, height: canvas.height } : undefined
  }, [])

  // Release the camera when leaving the page or when the app goes to the background.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') stop()
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [stop])

  return { supported, status, error, videoRef, start, stop, capture, torchAvailable, torchOn, setTorch, zoomRange, zoom, setZoom }
}
