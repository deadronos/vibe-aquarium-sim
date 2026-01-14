# [TASK015] - Fix build + code-splitting + lazy-load Rapier

**Status:** Completed  
**Added:** 2026-01-14  
**Updated:** 2026-01-14

## Original request

- Fix `npm run build` TypeScript errors.
- Implement code-splitting to reduce initial bundle size.
- Lazy-load `@react-three/rapier` (load on first simulation start).
- Auto-start the simulation when the page is ready.

## Outcome / summary

- Production build is green (`npm run build`).
- The initial JS bundle is now small; heavy `three` and `rapier` code ships as separate chunks.
- Physics/Rapier loads only after the simulation starts (user click or autostart).
- Dev stability improved by removing React StrictMode double-mount (avoids WebGL context loss).

## Key changes

- Debug typing fixes for build:
  - Added `Entity.__vibe_dbgCounter` for lightweight sampling.
  - Fixed `qualityStore` initial state to include `instanceUpdateBudget`.
  - Aligned `window.__vibe_debug` collector types (`ema`, `flushed`, `schedulerTuning`, `reset`).
- Bundle/code-splitting:
  - Added `vite` `manualChunks` to split major deps (`three`, `rapier`, `miniplex`, `zustand`, `vendor`).
  - Introduced `src/SimulationScene.tsx` and made the app shell lazy-load it.
  - `@react-three/rapier` imports moved into the lazy-loaded scene and components it owns.
- Autostart:
  - App auto-starts the simulation after the page is ready/idle, with a visible “Loading simulation…” fallback.
- WebGL context loss mitigation (dev):
  - Removed `React.StrictMode` wrapper in `src/main.tsx` to avoid R3F double-mount churn.

## Files touched (high level)

- `src/App.tsx` (shell, lazy-load + autostart overlay)
- `src/SimulationScene.tsx` (Canvas + Physics scene)
- `src/main.tsx` (removed StrictMode)
- `src/App.css` (overlay styles)
- `vite.config.ts` (manualChunks)
- `src/store.ts`, `src/performance/qualityStore.ts`, `src/declarations.d.ts`, `src/components/DebugHUD.tsx`, `src/systems/SchedulerSystem.tsx` (typing fixes)

## Validation

- `npm run build` (tsc + vite) passes.

## Notes / follow-ups

- `rapier` and `three` chunks remain large (expected). Future improvements would be progressive loading of optional visual features (e.g. postprocessing) and/or deeper vendor chunking.

### Deployed issue & patch (2026-01-14)

- After deploying to GitHub Pages we observed runtime errors on the live site:
  - `ReferenceError: Cannot access 'I' before initialization` in a small `zustand` chunk (manifested as a runtime bootstrap ordering bug).
  - `TypeError: Cannot read properties of undefined (reading 'useLayoutEffect')` traced to the `three` chunk in production.
- Root cause: subtle module evaluation ordering differences when vendor libraries are split into separate chunks on some hosting environments (observed on GitHub Pages). Tiny vendor chunks can evaluate before their dependencies are ready.
- Fix applied:
  - Merged `zustand` into the `vendor` chunk and rebuilt; this resolved the initial ReferenceError.
  - To be safe, merged `three` into the `vendor` chunk as well (ensures React + three + related libs evaluate in a single vendor file), rebuilt, and validated by serving `dist/` under the `/vibe-aquarium-sim` base path and verifying no console errors.
- Validation: production preview served locally (via a static server) showed no console errors and the simulation autostarted successfully.
- Recommendation: redeploy the current `dist/` to GitHub Pages. Add an automated smoke-test that loads the deployed URL and scans the browser console for exceptions (tracked as `TASK017`).
