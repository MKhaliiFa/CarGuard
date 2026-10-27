# CarGuard — فحص السيارة

CarGuard is an Arabic-first, right-to-left Progressive Web App that helps you inspect **your own car** for a suspected hidden GPS tracker, Bluetooth tracker, or audio recorder.

> **It does not detect devices automatically and never claims to.** It structures a careful manual inspection, records what *you* observe, and ranks vehicle zones for a closer look based only on those recorded observations.

## Features

| Module | What it does | Honest limits |
|---|---|---|
| Investigation workflow (`src/features/workflow`) | 5 guided steps: visual inspection → magnetic baseline/comparison → Bluetooth & OS tracker alerts → review → prioritized zones | Priorities are ordered by user-recorded observations. No probabilities. |
| Vehicle map (`src/features/checklist`) | 11 zones (exterior, underbody, grille/engine, dashboard/fuse box, OBD-II, front/rear seats, seat undersides, console, trunk/spare wheel, battery/wiring). Each has status (not inspected / inspected / needs follow-up), timestamp, notes, photos, observations, and safety limits | Never instructs removing panels, touching airbags, or probing live wiring. |
| Camera (`src/features/camera`) | Rear camera, torch and zoom **only if the track reports them**, still capture, review dialog. Photo is saved only after explicit consent. Fallback: native camera upload (`<input capture>`) | No automatic image analysis. Nothing is uploaded. |
| Magnetic sensor (`src/features/sensors`) | Generic Sensor `Magnetometer` live µT readings, X/Y/Z, stability (σ), sparkline, baseline, per-zone comparison | iOS: unavailable. Chrome Android: behind a flag. App shows **no number** until a real reading arrives. A reading can at most be “suspicious”. Compass-heading swing is offered as an indirect, unrecorded indicator. |
| Bluetooth (`src/features/bluetooth`) | Android unknown-tracker alerts and iOS unwanted-tracking alert guides with result logging; Web Bluetooth device chooser; experimental `requestLEScan` with real RSSI when the browser exposes it | iOS has no Web Bluetooth. RSSI shown only when the platform provides it. Unknown device ≠ surveillance. |
| Report (`src/features/report`) | HTML report (optional embedded photos) and JSON export, both after confirmation, generated locally | Report always carries the disclaimer. |
| Privacy (`src/features/privacy`) | Local-only storage (IndexedDB), delete-all (state, photos, offline cache) | No backend, accounts, analytics, mic, contacts, or location permission. |
| Diagnostics (`src/features/diagnostics`) | Live capability table for this browser | Reflects actual feature detection. |
| PWA | Manifest, icons, Workbox service worker, offline core checklist, install guide, update prompt | — |

Safety rule baked into the data model (`src/state/inspectionReducer.ts`): only `source: 'user'` observations can be `confirmed`. Sensor and Bluetooth data are clamped to `suspicious` at most, including when restoring stored data.

## Live object detection (camera page)

- **Model:** SSDLite MobileNet v2 trained on COCO (80 everyday classes), from TensorFlow.js models — **Apache-2.0** (`public/models/ssdlite_mobilenet_v2/NOTICE.txt`).
- **Self-hosted, ~9 MB:** weights re-encoded float32 → float16 by `scripts/quantize-model.mjs`; `scripts/verify-quantized-model.mjs` checked max output difference (scores 4.8e-3, boxes 8.6e-3). Downloaded only after the user taps *تشغيل الكشف الحي*, then cached by the service worker (`carguard-detection-model`) for offline use. No frames leave the device. CSP unchanged (same-origin model, no WASM/eval).
- **Runtime:** TF.js 4.22, lazy-loaded chunk (~280 KB gzip). Backend order: WebGPU (if `navigator.gpu`) → WebGL → CPU, with warm-up and automatic fallback.
- **Loop:** `requestAnimationFrame` draws; inference at most every 120 ms, backs off to 1.5× last inference time; power-saver = 500 ms; pauses when the tab is hidden or the camera stops.
- **UI:** green boxes on a canvas aligned to `object-fit: cover`, Arabic label + original class, confidence %, stable track IDs (IoU tracker) with status, tap or list to select, pixel size, centimetres **only after reference calibration** (bank card / A4 / custom) with ± error bars that exclude perspective, weight always *unavailable*, threshold slider, pause, camera switch, inference time.
- **Manual review** for small electronics (wires, magnets, LED, SIM slot, mic hole…), location notes, zone, classification, optional frame — saved locally after confirmation as an observation with detector metadata.
- **Not a tracker detector:** GPS/SIM trackers and recorders are not COCO classes. The model can only point at generic objects (e.g. *cell phone*, *remote*).

## Development

```bash
npm ci
npm run dev        # http://localhost:5173
npm run lint
npm run typecheck
npm test           # Vitest unit + component tests
npm run build      # type-check + production build into dist/
npx playwright install chromium   # once, or set PW_CHANNEL=chrome to use installed Chrome
npm run test:e2e   # responsive checks at iPhone 12, Reno12 F-sized and 320px viewports
```

**Real-model e2e (optional):** `e2e/detection.spec.ts` runs the self-hosted model in Chromium against a fake camera, under the production CSP copied from `render.yaml`, and expects a *cat* in the list. It is skipped unless `DETECTION_FIXTURE` points to a video file (not committed):

```bash
ffmpeg -loop 1 -i cat.jpg -t 2 -r 15 -vf "scale=640:480,format=yuvj420p" -f mjpeg /tmp/cat.mjpeg
DETECTION_FIXTURE=/tmp/cat.mjpeg npx playwright test --project=detection
```

The only CSP report it tolerates is `script-src wasm-eval`: `long.js` (a TF.js dependency) probes WebAssembly inside `try/catch` and falls back to JavaScript. The CSP intentionally stays without `'wasm-unsafe-eval'`.

Camera, sensors, Bluetooth and service workers require a **secure context**. `localhost` counts; a LAN IP over plain HTTP does not. To test on a phone, deploy (below) or use an HTTPS tunnel.

## Deploying to Render

The repo contains `render.yaml` (Render Blueprint) for a **static site**:

- Build: `npm ci && npm run build`, publish `./dist`, Node 22 (`.node-version` + `NODE_VERSION`).
- Headers: strict CSP (`script-src 'self'`), Permissions-Policy (camera/bluetooth/sensors only for self; microphone and geolocation disabled), HSTS, `no-cache` for `sw.js`/`index.html`/manifest, immutable caching for hashed assets.
- Routing is hash-based (`#/checklist`), so no rewrite rules are needed.

Steps:

1. Render Dashboard → **New → Blueprint** → connect GitHub → select the `CarGuard` repository → **Apply**.
   (Or **New → Static Site** with the same build command and publish directory; then add the headers from `render.yaml` manually.)
2. Wait for the build to finish and open the `https://<name>.onrender.com` URL. Render provides HTTPS automatically.
3. Every push to `main` redeploys automatically.

## Installing on the phones

**OPPO Reno12 F (Android, Chrome):** open the HTTPS URL in Chrome → ⋮ menu → *Install app* / *Add to Home screen*. Allow camera when prompted. For Bluetooth, Chrome may ask for *Nearby devices* (and on some versions location) — this is an Android requirement for Bluetooth; the app does not read your location.

**iPhone 12 (iOS, Safari):** open the URL in Safari → Share → *Add to Home Screen* → Add.

## Manual testing still required on physical devices

Automated tests run in jsdom and desktop Chrome with phone viewports. They **do not** prove behaviour on the real phones. Please verify:

- [ ] Rear camera opens on both phones; torch toggle appears on Android if supported; zoom slider appears only where supported.
- [ ] Capture → review → save → photo visible in the zone; discard leaves nothing stored.
- [ ] iPhone: sensor page shows the “unavailable” explanation; compass indicator asks for motion permission and shows heading.
- [ ] Android Chrome: magnetometer is unavailable by default; optionally enable `chrome://flags/#enable-generic-sensor-extra-classes` and confirm live readings, baseline and zone comparison.
- [ ] Android Chrome: device chooser opens and returns a device; experimental LE scan appears only with `chrome://flags/#enable-experimental-web-platform-features`.
- [ ] Android: *Settings → Safety & emergency → Unknown tracker alerts → Scan now* path on ColorOS (may differ by version).
- [ ] iPhone: Find My tracking notifications are enabled.
- [ ] Install to home screen on both; open in airplane mode → checklist and notes still work.
- [ ] Export report (with and without photos) opens correctly; Delete all data empties everything.
- [ ] Permission denial: deny camera / Bluetooth and confirm clear messages.
- [ ] Live detection on both phones: model download progress, backend shown (WEBGPU/WEBGL), boxes stay aligned in portrait and landscape, phone temperature after 5 min (try power saver), camera switch, calibration with a bank card, manual review save, camera light turns off after *إيقاف* and after leaving the page.

## Known limitations

- No web or phone sensor can reliably detect every tracker or recorder. Cellular trackers wired to the car, silent recorders, or devices behind trim panels may need a professional inspection.
- iOS Safari exposes no magnetometer and no Web Bluetooth.
- Chrome on Android exposes the magnetometer and BLE scanning only behind flags; device chooser does not give RSSI.
- Torch control depends on browser and device.
- No AI image analysis is integrated (it would require uploading photos).
- Data lives in this browser only; clearing site data removes it. Export a report to keep a copy.
