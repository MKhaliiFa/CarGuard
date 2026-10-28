# Handoff — UI/UX overhaul (branch `feat/ui-overhaul`)

Base: `main` @ `d7714cc` (local Mac was fast-forwarded to GitHub; nothing local was lost — tree was clean).

## Done
- Design tokens rewritten (`src/styles/tokens.css`): charcoal surfaces, emerald accent, semantic colours
  (neutral / ok=green=completed only / warn=amber=follow-up / danger=red). Legacy `--c-amber` etc. kept as aliases.
- CSS split: `global.css` (base/shell/primitives), `components.css` (sheet dialogs, sliding segmented control,
  progress bar/ring, toasts, sparkline, intro), `features.css` (hero, tool bento, journey stepper, vehicle map, camera).
- First-launch intro (`components/Intro.tsx`), skippable, remembered via `lib/prefs.ts` (`carguard.introSeen`);
  replay button in Settings (`MoreView`, event `carguard:show-intro`).
- Guided 7-step journey: pure logic `lib/journey.ts` (done/inconclusive/progress/todo/skipped/unavailable),
  persisted marks via new reducer action `setStepMark` + optional `stepMarks` in state (normalized on load).
  Unavailable steps are excluded from progress. UI: `features/workflow/JourneyPanel.tsx`, dashboard `WorkflowView.tsx`.
- Interactive top-down vehicle map (`features/checklist/VehicleMap.tsx`), status-coloured zones, "next zone" button.
- Camera: viewfinder idle state, HUD, round shutter, torch/fullscreen tools, immersive mode (Esc exits), capture flash.
- Toasts (`components/Toast.tsx`) on photo save/discard and report export; export marks journey "report" step done.
- Detection overlay boxes changed from green to neutral (green must never imply a found device).
- Sparkline: area fill, baseline legend, live dot (real readings only).

## Verified
- `npm run typecheck` ✅  `npm run lint` ✅  `npm test` ✅ 124 tests (new: journey, Intro, WorkflowView, ChecklistView).
- Playwright (Chrome, 3 mobile viewports): 32 passed, **4 failing** — see below.

## Remaining
1. E2E: `workflow` page has 2px horizontal overflow on iphone-12 / reno12f widths. Clipping `.stepper` did not fix it —
   find the overflowing element (likely `.hero` ring/grid, `.tool-viewfinder`, or `.journey-nav`), then rerun:
   `PW_CHANNEL=chrome npx playwright test --project=iphone-12 --project=android-reno12f --project=small-320`
2. E2E `journey: mark a step, progress persists across reload` fails on all 3 viewports (same 2px overflow assertion
   at the end of the test — persistence itself may be fine; confirm after fixing #1).
3. Visual QA screenshots at 320/390/412 (e2e/screenshots), check both intro and immersive camera on real devices
   (iPhone 12 Safari, OPPO Reno12 F Chrome) — not done; desktop Chromium is not proof for iOS Safari.
4. Restyle remaining secondary screens lightly (Bluetooth, Report, Settings panels inherit new tokens but weren't redesigned).
5. Update README (design system + journey), then open PR `feat/ui-overhaul` → `main`.
