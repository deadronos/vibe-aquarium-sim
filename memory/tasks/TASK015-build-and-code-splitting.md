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
