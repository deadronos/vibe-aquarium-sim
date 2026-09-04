# Phase 2 Frame-Loop Telemetry Plan

> **For agentic workers:** Execute this plan task-by-task and keep the checkboxes current.

**Goal:** Close issue #144 by removing unconditional diagnostic timing and per-frame status allocations from the render and scheduler loops while preserving opt-in Debug HUD telemetry and adaptive scheduling behavior.

**Architecture:** The simulation and render loops remain allocation-conscious in their steady state. `window.__vibe_debug` is the explicit opt-in telemetry signal; systems sample clocks and publish diagnostics only when that signal is present. Adaptive scheduling retains timing only while its adaptive policy is enabled. Diagnostic status objects are allocated once per mounted system and mutated thereafter.

**Tech Stack:** React 19, React Three Fiber, Three.js, Vitest, Testing Library, TypeScript.

### Task 1: Establish the telemetry contract with failing tests

**Files:**

- Modify: `tests/SchedulerSystem.test.tsx` to assert disabled diagnostics do not call `performance.now()` or publish status, while enabled diagnostics still publish.
- Modify: `tests/FishRenderSystem.adaptive.test.tsx` to assert the render loop is inert when diagnostics are disabled.

- [x] **Step 1: Write the failing tests**

  Reset all global telemetry fields per test. Add disabled-path assertions for both systems and an enabled scheduler assertion that observes a stable status object.

- [x] **Step 2: Run the focused tests and verify they fail**

  Run:

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase2-telemetry.localstorage' npm run test -- tests/SchedulerSystem.test.tsx tests/FishRenderSystem.adaptive.test.tsx
  ```

  The disabled-path tests should fail against the current unconditional `performance.now()` calls and status object literals.

### Task 2: Gate frame-loop diagnostics and retain adaptive timing only when needed

**Files:**

- Modify: `src/systems/SchedulerSystem.tsx` to gate timing/status publication, reuse a status object, and preserve adaptive scheduler timing when enabled.
- Modify: `src/systems/FishRenderSystem.tsx` to gate timing/EMA/status work behind telemetry or the adaptive instance-update policy and reuse a status object.
- Modify: `src/components/DebugHUD.tsx` to initialize the explicit telemetry collector while visible and clean it up when hidden.
- Modify: `src/declarations.d.ts` if the stable status types need tightening.

- [x] **Step 1: Implement the smallest green change**

  Read `window.__vibe_debug` once per callback. Avoid `performance.now()` and status mutation when neither telemetry nor adaptive scheduling requires timing. Keep all detailed debug entry allocations behind the existing collector check. Replace per-frame status object literals with mount-time refs.

- [x] **Step 2: Preserve adaptive behavior**

  Ensure `adaptiveSchedulerEnabled` still measures scheduler cost without the HUD. Rapier owns production fixed-step pacing, so max-substep tuning remains limited to legacy `update(delta)` callers. Ensure adaptive instance flushing still runs without requiring telemetry.

- [x] **Step 3: Make the Debug HUD an explicit opt-in**

  Call `ensurePerfDebug()` when the HUD mounts and remove the collector/status fields when the HUD unmounts if the HUD created them. Existing external debug harnesses must remain untouched.

- [x] **Step 4: Run focused tests and refactor only after green**

  Re-run the focused command, then inspect the callbacks to confirm no object literals, `Date.now()`, or `performance.now()` calls remain on the disabled path.

### Task 3: Document and validate steady-state behavior

**Files:**

- Create: `docs/performance/frame-loop-telemetry.md` documenting the opt-in signal, adaptive exceptions, and a repeatable browser profiling procedure.

- [x] **Step 1: Record the development profile contract**

  Document the automated assertions and the Chrome Performance/Memory workflow for comparing telemetry-disabled and Debug HUD-enabled runs at 30/60/120 Hz.

- [x] **Step 2: Run the complete validation matrix**

  Run:

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase2-telemetry.localstorage' npm run format:check
  npm run lint -- --max-warnings=0
  npm run typecheck
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase2-telemetry.localstorage' npm run test
  npm run build
  npm run test:smoke
  git diff --check
  ```

- [x] **Step 3: Update project memory and issue handoff**

  Record the Phase 2 branch, issue #144 status, validation counts, and the follow-on order (#143, #142, #145) in `memory/activeContext.md` and `memory/progress.md`. Prepare a draft PR linked to #144 without claiming #140/#141 are complete.
