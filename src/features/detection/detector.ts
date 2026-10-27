import type { Detection } from './tracker'

export const MODEL_URL = '/models/ssdlite_mobilenet_v2/model.json'
export const MODEL_NAME = 'SSDLite MobileNet v2 (COCO)'
export const MAX_BOXES = 20

export type Backend = 'webgpu' | 'webgl' | 'cpu'

export interface Detector {
  readonly backend: Backend
  detect(source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement, minScore: number): Promise<Detection[]>
  dispose(): void
}

export type ProgressFn = (loadedBytes: number, totalBytes: number | undefined) => void
export type DetectorLoader = (onProgress: ProgressFn) => Promise<Detector>

interface TfLike {
  setBackend(name: string): Promise<boolean>
  ready(): Promise<void>
}

/** Tries backends in order and returns the first that initialises. */
export async function selectBackend(tf: TfLike, candidates: readonly Backend[]): Promise<Backend> {
  for (const name of candidates) {
    try {
      if (await tf.setBackend(name)) {
        await tf.ready()
        return name
      }
    } catch {
      // Try the next backend.
    }
  }
  throw new Error('No TensorFlow.js backend could be initialised on this device')
}

export function backendCandidates(nav: Navigator = navigator): Backend[] {
  return 'gpu' in nav && nav.gpu ? ['webgpu', 'webgl', 'cpu'] : ['webgl', 'cpu']
}

/**
 * Downloads the model files once with byte-level progress so the following load is served
 * from the HTTP / service-worker cache. Only same-origin files listed in model.json are fetched.
 */
export async function prefetchModel(onProgress: ProgressFn, fetchFn: typeof fetch = fetch): Promise<void> {
  const res = await fetchFn(MODEL_URL)
  if (!res.ok) throw new Error(`model.json: HTTP ${res.status}`)
  const manifest = (await res.json()) as { weightsManifest: { paths: string[] }[] }
  const base = MODEL_URL.slice(0, MODEL_URL.lastIndexOf('/') + 1)
  const paths = manifest.weightsManifest.flatMap((g) => g.paths).filter((p) => /^[\w.-]+$/.test(p))
  const sizes = new Map<string, number>()
  const loaded = new Map<string, number>()
  const report = () => {
    const total = sizes.size === paths.length ? [...sizes.values()].reduce((a, b) => a + b, 0) : undefined
    onProgress([...loaded.values()].reduce((a, b) => a + b, 0), total)
  }
  await Promise.all(
    paths.map(async (p) => {
      const r = await fetchFn(base + p)
      if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`)
      const len = Number(r.headers.get('content-length'))
      if (len > 0) sizes.set(p, len)
      if (!r.body) {
        loaded.set(p, (await r.arrayBuffer()).byteLength)
        return report()
      }
      const reader = r.body.getReader()
      let got = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        got += value.byteLength
        loaded.set(p, got)
        report()
      }
    }),
  )
}

/** Real on-device detector: TF.js + COCO-SSD, loaded lazily so the main bundle stays small. */
export const loadCocoDetector: DetectorLoader = async (onProgress) => {
  await prefetchModel(onProgress)
  const [tf, cocoSsd] = await Promise.all([
    import('@tensorflow/tfjs-core'),
    import('@tensorflow-models/coco-ssd'),
    import('@tensorflow/tfjs-backend-webgl'),
    import('@tensorflow/tfjs-backend-cpu'),
  ])
  const candidates = backendCandidates()
  if (candidates[0] === 'webgpu') await import('@tensorflow/tfjs-backend-webgpu')

  let lastError: unknown
  for (const candidate of candidates) {
    let backend: Backend
    try {
      backend = await selectBackend(tf, [candidate])
    } catch (err) {
      lastError = err
      continue
    }
    try {
      const model = await cocoSsd.load({ base: 'lite_mobilenet_v2', modelUrl: MODEL_URL })
      // Warm-up compiles shaders and surfaces backend bugs (e.g. partial WebGPU support) before going live.
      const warm = document.createElement('canvas')
      warm.width = 64
      warm.height = 64
      await model.detect(warm, 1, 0.99)
      return {
        backend,
        async detect(source, minScore) {
          const out = await model.detect(source, MAX_BOXES, minScore)
          return out.map((o) => ({ label: o.class, score: o.score, box: [o.bbox[0], o.bbox[1], o.bbox[2], o.bbox[3]] as const }))
        },
        dispose: () => model.dispose(),
      }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Model failed to load')
}
