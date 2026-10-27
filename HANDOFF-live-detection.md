# Live detection upgrade — handoff (work in progress)

Branch: `feat/live-detection`. `main` is untouched and still deployed.

## Done
- Model: COCO-SSD SSDLite MobileNet v2 (Apache-2.0, TF.js 4.22), self-hosted in `public/models/ssdlite_mobilenet_v2/`,
  quantized to float16 (~9 MB) by `scripts/quantize-model.mjs`; verified vs float32 by `scripts/verify-quantized-model.mjs`
  (max Δ scores 4.8e-3, boxes 8.6e-3).
- `src/features/detection/labels.ts` (Arabic COCO labels), `tracker.ts` (IoU tracker, stable IDs), `measure.ts` (reference calibration, ± error, weight unavailable).

## Done since
- detector.ts, overlay.ts, useDetectionLoop.ts, LiveDetection.tsx, DetectionDetails.tsx, ManualReviewForm.tsx, camera switch in useCamera, integrated in CameraInspection.
- Workbox runtime cache for model, render.yaml immutable cache for /models/*, report + ObservationList show detection/review metadata.
- 100 unit/component tests pass; lint + types clean; build OK, detection chunks lazy and not precached.

## Remaining
1. E2E: run the REAL model in Chrome under the production CSP (copy CSP from render.yaml via page.route) with fake camera fed from
   `/Library/User Pictures/Animals/Zebra.heic` (sips → jpg → ffmpeg mjpeg, `--use-file-for-fake-video-capture`); assert a zebra box and no CSP errors. Do not commit the image.
2. Re-run Playwright responsive suite (PW_CHANNEL=chrome) for camera page.
3. Merge `feat/live-detection` into `main`, push, confirm Render deploy, test on both phones.
