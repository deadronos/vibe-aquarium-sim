# Progress

## What works

- Project scaffold and core components exist in `src/` (Fish, Tank, BoidsSystem, store)
- Basic unit test harness and linting configuration present (Vitest, ESLint, Prettier)
- Boids + water drag/current calculations are offloaded to a multithreaded worker and applied back to ECS each fixed step.
- Documentation: `AGENTS.md` and `.github/copilot-instructions.md` updated to reference `.github/instructions/memory-bank.instructions.md` and `.github/instructions/spec-driven-workflow-v1.instructions.md` and recorded in memory (2025-12-09)

## What's left / next milestones

1. Add automated integration tests for feeding behavior and end-to-end ECS↔Physics scenarios.
2. Performance tuning under larger counts (50–100 fish) and profiling shader / system hotspots.
3. Add a small runtime UI for tuning water/physics parameters (Zustand planned).
4. Optional: implement a grid-based velocity field (trilinear sampling) if procedural currents are insufficient for future features.

## Current status

- Phase: Phase 1 and Phase 2 merged; Phase 3 adaptive quality complete pending PR review.
- Branch: `codex/phase2-adaptive-quality` (issue #143)

## Known issues / technical debt

- No persistent tasks or design docs were present in `memory/` before this update — memory bank must be maintained as work continues.
- Full fluid simulation is out of scope for current milestone and should be tracked separately as a design item.

### 2025-12-15

- Backfilled memory bank: added DES004 (physics force-queue) and DES005 (feeding) and updated `memory/tasks` to reflect implemented work.
- TASK002 (Water), TASK003 (Fixed-step), and TASK004 (Fix fish motion) marked Completed; TASK005 and TASK006 added as Completed.
- Ran unit tests for `physicsHelpers`, `WaterResistanceSystem`, `WaterCurrentSystem`, `FixedStepScheduler`, and `Fish` — all passed.
- Next: add integration tests for feeding and run performance profiling as needed.

### 2025-12-17

- Fixed food spawning issue where pellets were unreachable on tank edges (TASK011). Clamped spawn coordinates to `SIMULATION_BOUNDS`.

### 2025-12-21

- Offloaded boids, food seeking, and water forces to a `multithreading` worker kernel; main thread now applies results and side effects (TASK012).
- App wiring updated to avoid double-applying water forces; format and lint run cleanly.

### 2026-01-14

- **Fix:** Resolved an instancing bug where only one fish was visible when many were spawned. Cause: per-instance matrices were not being written in the non-adaptive baseline path (PoC disabled), so instances used identity matrices and overlapped. Fix: `FishRenderSystem.tsx` now writes instance matrices directly in the hot loop when adaptive instance updates are disabled, and retains the chunked dirty-flush behavior when the PoC flag is enabled. (Files: `src/systems/FishRenderSystem.tsx`). Created `TASK016` documenting the fix and verification steps.

- **Build:** Fixed `npm run build` errors caused by debug/perf typings and store state drift; aligned `window.__vibe_debug` entry types and added missing fields (`instanceUpdateBudget`, `__vibe_dbgCounter`).
- **Performance/UX:** Added code-splitting via Vite `manualChunks`, moved the full `Canvas` + `Physics` tree into a lazy-loaded `SimulationScene`, and gated Rapier behind a start/autostart flow.
- **Stability:** Removed React StrictMode wrapper in `src/main.tsx` to avoid dev-only WebGL context loss from double-mounting.
- **Deployed fix:** Observed runtime console errors on GitHub Pages due to module evaluation ordering; merged `zustand` (and then `three`) into the `vendor` chunk to ensure stable evaluation order, rebuilt and validated locally. Created follow-up `TASK017` to add deployment smoke tests.
- Recorded as `TASK015`.

### 2026-01-13

- Backfilled the Tank visual material and caustics uniforms into a new design doc `DES015`. Recorded exact `MeshTransmissionMaterial` defaults (opacity, ior, attenuationColor, clearcoat, etc.) and caustics shader uniforms (intensity, scale, speed, color).
- Created `TASK013` (completed) to record values and `TASK014` (pending) to add unit tests ensuring the Tank material defaults remain stable.

### 2026-01-19

- **Feature (Visuals):** Implemented Marine Snow particle system (`AmbientParticles.tsx`) to add depth.
  - Replaced the static/wobbling ambient particles with a directional drift system.
  - Implemented infinite wrapping via vertex shader (`mod()` based on volume bounds).
  - Tuned for high subtlety (tiny white specks) to avoid visual noise.
  - Validated with `npm run typecheck`.

### 2026-03-29

- **Optimization:** Addressed issue #110 by adding a `SharedArrayBuffer` transport for boids worker inputs/outputs, eliminating per-frame structured cloning on cross-origin isolated hosts while preserving the old worker path as a fallback elsewhere.
- **Validation:** Added targeted shared-buffer tests and reran `npm run test`, `npm run lint -- --max-warnings=0`, and `npm run typecheck`.

### 2026-09-03

- **Phase 1:** Completed physics/renderer correctness, CI/coverage/bundle budgets, production-preview smoke coverage, and favicon/SPA fallback hardening on `codex/phase1-quality` (PR #151).
- **Review follow-ups:** Preview routing now strips query parameters before static resolution, `.glb` responses advertise `model/gltf-binary`, and smoke coverage explicitly requests WebGPU with a deterministic unavailable-capability fallback.
- **Validation:** The two Playwright smoke tests pass locally; full unit/lint/typecheck/build validation and remote CI are green on the preceding Phase 1 commit.
- **Deferred:** Visual parity (#140) and refresh-rate trajectory (#141) remain intentionally open until runtime measurements are available.
- **Next:** Review Phase 2 PR #152, then proceed to adaptive quality (#143), zero-copy transport (#142), and asset transfer reduction (#145).

### 2026-09-03 (Phase 2)

- **Performance:** Closed the #144 implementation gap by gating `performance.now()` and debug status publication in `FishRenderSystem` and `SchedulerSystem`, reusing stable status objects, and preserving adaptive scheduler timing when its policy is enabled.
- **Debug UX:** `DebugHUD` now explicitly creates the telemetry collector while visible and cleans up telemetry when hidden; low-frequency HUD snapshots preserve React updates despite stable system status references.
- **Validation:** Added disabled/enabled telemetry tests and Debug HUD lifecycle coverage. Full suite: 112 passed, 1 skipped; lint, typecheck, formatting, build, bundle budgets, and both browser smoke tests pass.
- **Documentation:** Added `docs/performance/frame-loop-telemetry.md` with the steady-state test contract and repeatable Chrome Performance/Memory profiling procedure.

### 2026-09-03 (Phase 3)

- **Quality profiles:** Added backend-aware quality resolution. Low disables caustics, fish rim/SSS, spot shadows, tank transmission, and dispersion; WebGPU uses smaller startup shadow maps.
- **Safety:** Initial shadow sizes are resolved before lights mount; WebGL may resize after transitions, while WebGPU never resizes or manually disposes shadow maps. Low WebGPU keeps the tank mounted on a standard material path.
- **Adaptive telemetry:** Added hysteretic downshift/recovery coverage with bounded opt-in `qualityTransitions` diagnostics and a resolved `__vibe_qualityStatus` snapshot.
- **Stress coverage:** Added `?quality=low&stress=quality` browser smoke coverage with a bounded 300-fish school; normal startup remains 30 fish.
- **Validation:** Full unit suite: 125 passed, 1 skipped; format, lint, typecheck, build, bundle budget, and all three preview smoke tests pass locally.
