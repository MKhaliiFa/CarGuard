# Handoff — UI/UX overhaul (branch `feat/ui-overhaul`)

Base: `main` @ `d7714cc`. Status: **ready for review** (PR to `main`, not merged, not deployed).

## Done
- Design tokens rewritten (`src/styles/tokens.css`): charcoal surfaces, emerald accent, semantic colours
  (neutral / ok=green=completed only / warn=amber=follow-up / danger=red). Legacy `--c-amber` etc. kept as aliases.
- CSS split: `global.css` (base/shell/primitives), `components.css` (sheet dialogs, sliding segmented control,
  progress bar/ring, toasts, sparkline, intro), `features.css` (hero, tool bento, journey stepper, vehicle map, camera,
  secondary-screen patterns).
- First-launch intro (`components/Intro.tsx`), skippable, remembered via `lib/prefs.ts` (`carguard.introSeen`);
  replay button in Settings (`MoreView`, event `carguard:show-intro`).
- Guided 7-step journey: pure logic `lib/journey.ts`, persisted marks via reducer action `setStepMark` + optional
  `stepMarks` in state (normalized on load). Unavailable steps are excluded from progress.
  UI: `features/workflow/JourneyPanel.tsx`, dashboard `WorkflowView.tsx`.
- Interactive top-down vehicle map (`features/checklist/VehicleMap.tsx`), status-coloured zones, "next zone" button.
- Camera: viewfinder idle state, HUD, round shutter, torch/fullscreen tools, immersive mode (Esc exits), capture flash.
- Toasts on photo save/discard and report export; export marks the journey "report" step done.
- Detection overlay boxes neutral (green must never imply a found device).
- Secondary screens restyled to the same system: Bluetooth (`OsTrackerChecks`, `WebBluetoothPanel`), Report
  (real-count summary strip, export options), Settings (`DiagnosticsPanel`, `InstallGuide`, `PrivacyPanel`, intro replay).
  Capability "متاح" chips are neutral, not green. All button/heading texts the tests use are unchanged.
- README: design-system and 7-step journey sections; stale "5 steps" / "green boxes" lines corrected.

## Fixed in the final pass
- **2px horizontal overflow on `#/workflow`** — root cause: the journey card's `card-in-forward` animation started at
  `translateX(-18px)` while the page gutter is 16px, so for ~200ms after load (and after each step change) the card
  crossed the left viewport edge in RTL, widening the scroll area and scrolling the page (`scrollX=-2`). It was
  transient, which is why it failed intermittently and why clipping `.stepper` did nothing. The slide distance is now
  derived from the gutter (`--card-shift`). Verified with a per-animation-frame sampler on all 7 routes at 320/390/412:
  zero overflowing frames.
- **Journey persistence e2e** now also asserts the restored stepper state and includes a negative control: deleting the
  IndexedDB record and reloading must reset the journey. So it passes only if state really comes from IndexedDB.
- **Flaky unit test** (`ChecklistView` vehicle map, ~1 in 5 runs): actions dispatched before the IndexedDB hydrate are
  replaced by it. Tests now wait via `waitForHydration()` (`src/test/render.tsx`). The underlying app race (a tap in the
  first moments after launch could be lost) is **not fixed here** — proposed as a separate task.
- Narrow-screen polish from screenshot review: hero eyebrow no longer runs under the progress ring at ≤420px;
  stepper labels hidden at ≤360px (step card names the current step, dots keep accessible names); "OBD-II" no longer
  breaks at the hyphen in the camera hint heading (bidi scramble); Bluetooth status chip moved under the title.
- `playwright.config.ts`: optional `PW_EXECUTABLE_PATH` to use a preinstalled Chromium (no effect when unset).

## Verified (cloud container, Linux, Chromium 1243 via PW_EXECUTABLE_PATH)
- `npm run typecheck` ✅  `npm run lint` ✅  `npm test` ✅ 122/122 (3 consecutive runs)  `npm run build` ✅
- Playwright `--project=iphone-12 --project=android-reno12f --project=small-320`: **36/36 passed**; with
  `--repeat-each=3`: 108/108.
- The `detection` project (real model + fake camera) was not run: it needs a `DETECTION_FIXTURE` video.

## Remaining
1. Real-device QA — not done. Desktop Chromium at phone viewports is not proof for iPhone 12 Safari or OPPO Reno12 F
   Chrome: check intro, immersive camera, torch, safe areas, backdrop blur, and the checklist in README.
2. Hydration race in `InspectionContext` (see above): queue or block input until `ready`.
