# Live detection upgrade — handoff (work in progress)

Branch: `feat/live-detection`. `main` is untouched and still deployed.

## Done
- Model: COCO-SSD SSDLite MobileNet v2 (Apache-2.0, TF.js 4.22), self-hosted in `public/models/ssdlite_mobilenet_v2/`,
  quantized to float16 (~9 MB) by `scripts/quantize-model.mjs`; verified vs float32 by `scripts/verify-quantized-model.mjs`
  (max Δ scores 4.8e-3, boxes 8.6e-3).
- `src/features/detection/labels.ts` (Arabic COCO labels), `tracker.ts` (IoU tracker, stable IDs), `measure.ts` (reference calibration, ± error, weight unavailable).

## Remaining
1. `detector.ts`: dynamic import tfjs-core + backends (webgpu if `navigator.gpu` → webgl → cpu), coco-ssd `load({ base: 'lite_mobilenet_v2', modelUrl: '/models/ssdlite_mobilenet_v2/model.json' })`, warm-up, prefetch with byte progress.
2. `overlay.ts` (object-fit cover transform + inverse for taps, green boxes), `useDetectionLoop.ts` (rAF, adaptive interval ≥120 ms, power saver, pause when hidden).
3. `LiveDetection.tsx` inside `CameraInspection` (shares `useCamera`; add device list + switch), detection list, details panel, calibration, manual review of small electronics → Observation with `detection`/`review` metadata (extend `src/lib/types.ts`, report, ObservationList).
4. Workbox: exclude `/models/**` and tf chunks from precache; runtime CacheFirst for `/models/`; render.yaml immutable cache for `/models/*`. CSP needs no change (no wasm/eval; same-origin model).
5. Tests: tracker, measure, overlay, labels, backend fallback, loader error state, detection render with injected detector, camera shutdown. E2E: Chrome fake camera from macOS `/Library/User Pictures/Animals/Zebra.heic` (do not commit image) under production CSP.
6. Update README (model, license, size, limits, manual device tests), merge to main, push.
