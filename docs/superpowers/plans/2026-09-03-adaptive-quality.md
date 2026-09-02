# Adaptive Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close issue #143 by making the low quality tier effective on WebGL and WebGPU, deriving initial shadow sizes from quality, and proving adaptive degradation/recovery without unsafe WebGPU resource disposal.

**Architecture:** Keep `qualityPresets.ts` as the renderer-independent source of base values and add a pure backend-aware profile resolver. `VisualQualityProvider` supplies the resolved optional-cost flags, while `SimulationScene` derives initial light configuration before the Canvas mounts. Adaptive transitions remain hysteretic and cooldown-protected, with bounded opt-in telemetry and a deterministic frame-sequence harness for stress/recovery validation.

**Tech Stack:** React 19, React Three Fiber, Three.js WebGL/WebGPU, Zustand, Vitest, Playwright, TypeScript.

---

### Task 1: Add a pure backend-aware profile resolver

**Files:**

- Create: `src/performance/qualityProfile.ts`.
- Modify: `src/performance/qualityPresets.ts` only where shared types need to be exported.
- Test: `tests/qualityProfile.test.ts`.

- [x] **Step 1: Write failing profile tests**

  Assert that `getQualityProfile('low', 'webgl')` and
  `getQualityProfile('low', 'webgpu')` disable caustics, fish rim/SSS, spot
  shadows, transmission, and dispersion. Assert that medium and higher tiers
  retain optional costs, and that WebGPU shadow sizes use the documented
  backend-specific values while WebGL retains the existing preset sizes.

- [x] **Step 2: Run the focused test and verify it fails**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-quality-profile.localstorage' npm run test -- tests/qualityProfile.test.ts
  ```

  Expected: module/export failures because no profile resolver exists yet.

- [x] **Step 3: Implement the resolver**

  Define `RendererBackend`, `QualityProfile`, and `getQualityProfile(level,
backend)`. Start from `getQualitySettings`, copy the immutable base values,
  and apply explicit cost flags plus backend shadow-size overrides without
  mutating `QUALITY_PRESETS`.

- [x] **Step 4: Run the focused test and commit**

  Re-run the command until green, then commit the resolver and tests:

  ```bash
  git add src/performance/qualityProfile.ts src/performance/qualityPresets.ts tests/qualityProfile.test.ts
  git commit -m "feat: add backend-aware quality profiles"
  ```

### Task 2: Thread profiles through the provider, store, and initial scene

**Files:**

- Modify: `src/performance/VisualQualityContext.ts` and
  `src/performance/VisualQualityProvider.tsx` to expose `qualityProfile`.
- Modify: `src/App.tsx` and create `src/performance/qualityQuery.ts` to accept
  an explicit `?quality=low|medium|high|ultra` startup override.
- Modify: `src/SimulationScene.tsx` to resolve the initial backend profile and
  pass its shadow size to scene lights.
- Test: `tests/VisualQualityContext.test.tsx` and
  `tests/qualityQuery.test.ts`.

- [x] **Step 1: Write failing context/query tests**

  Assert that the provider exposes the WebGL and WebGPU profile flags and that
  invalid/missing quality query values leave the store level unchanged while a
  valid value selects the requested level.

- [x] **Step 2: Implement profile context and query override**

  Add `qualityProfile` to the context value. In `App`, apply a valid query
  level once on mount through `useQualityStore.getState().setLevel`; leave the
  current default untouched when no valid query is present.

- [x] **Step 3: Derive initial shadow configuration**

  In `SimulationScene`, resolve the current level and backend before rendering
  lights. Render a small context-aware lighting component with
  `shadow-mapSize-width/height={profile.shadowMapSize}`. Keep directional
  shadows enabled and let the profile control spot-light shadows.

- [x] **Step 4: Run focused tests and build**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-quality-context.localstorage' npm run test -- tests/VisualQualityContext.test.tsx tests/qualityQuery.test.ts
  npm run typecheck
  ```

  Commit once both checks pass.

### Task 3: Remove low-tier GPU costs without unsafe resource churn

**Files:**

- Modify: `src/components/Tank.tsx` to use a non-transmissive material for the
  low WebGPU profile and to honor the dispersion flag.
- Modify: `src/systems/FishRenderSystem.tsx` to skip optional shader enhancement
  when both fish-lighting flags are disabled.
- Modify: `src/performance/AdaptiveQualityManager.tsx` to use resolved profile
  shadow sizes and keep WebGPU resize/disposal disabled.
- Test: `tests/TankMaterial.test.tsx`, `tests/FishRenderSystem.adaptive.test.tsx`,
  and `tests/AdaptiveQualityManager.test.tsx`.

- [x] **Step 1: Add failing low-cost and WebGPU safety tests**

  Assert low profiles expose all optional-cost flags as false, the low WebGPU
  tank does not mount transmission, and changing a WebGPU quality level never
  calls shadow-map resize or manual disposal. Assert the fish renderer does not
  invoke the lighting enhancement when both flags are disabled.

- [x] **Step 2: Implement material and fish gates**

  Keep the tank mesh mounted while switching its material properties/path from
  the resolved profile. Pass zero dispersion when disabled. Include lighting
  flags in the fish asset memo dependencies and return the source materials
  unchanged when both optional effects are off.

- [x] **Step 3: Apply safe profile shadow behavior**

  Use `getQualityProfile(level, isWebGPU ? 'webgpu' : 'webgl')` in the manager.
  Apply transition shadow resizing only for WebGL; WebGPU remains at its
  initial JSX size and never manually disposes the old map.

- [x] **Step 4: Run focused tests and commit**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-quality-costs.localstorage' npm run test -- tests/TankMaterial.test.tsx tests/FishRenderSystem.adaptive.test.tsx tests/AdaptiveQualityManager.test.tsx
  ```

### Task 4: Add transition telemetry and deterministic stress/recovery coverage

**Files:**

- Modify: `src/performance/AdaptiveQualityManager.tsx` to record bounded,
  opt-in transition entries with backend, from/to levels, EMA, and reason.
- Modify: `src/utils/perfDebug.ts` and `src/declarations.d.ts` for the typed
  `qualityTransitions` collector field.
- Test: `tests/AdaptiveQualityManager.test.tsx` with a captured `useFrame`
  callback and synthetic 30/60 FPS sequences.

- [x] **Step 1: Write the failing transition tests**

  Drive enough 30 FPS samples to cross the existing hysteresis from high to
  low, then enough 60 FPS samples to move back toward medium/high. Assert
  transition reasons and that telemetry stays absent when no collector exists.

- [x] **Step 2: Implement bounded opt-in telemetry**

  Add a reusable `recordQualityTransition` helper that appends at most 32
  entries to `window.__vibe_debug.qualityTransitions` and does nothing when the
  collector is absent. Call it for low-FPS, high-FPS, and device-clamp outcomes.

- [x] **Step 3: Run the deterministic stress test**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-quality-stress.localstorage' npm run test -- tests/AdaptiveQualityManager.test.tsx
  ```

  Record the observed downshift and recovery assertions in the performance
  documentation.

### Task 5: Add browser smoke coverage, documentation, and handoff

**Files:**

- Modify: `src/systems/Spawner.tsx` to support a bounded `stress=quality`
  startup school and preserve the normal 30-fish default.
- Modify: `tests/e2e/smoke.spec.ts` to cover `?quality=low&stress=quality`, the
  low-cost status, fish count, and no page errors/404s.
- Create: `docs/performance/adaptive-quality.md` with profile values,
  transition telemetry, and stress/recovery procedure.
- Modify: `memory/activeContext.md`, `memory/progress.md`, and this plan.

- [x] **Step 1: Write the failing smoke assertion**

  Navigate to `./index.html?quality=low&stress=quality`, wait for the canvas and
  bounded larger school, and assert the exposed quality status reports low,
  disabled optional costs, and no failed responses.

- [x] **Step 2: Implement the stress startup/status surface**

  Spawn 300 fish only for the explicit stress query and expose a low-frequency
  `window.__vibe_qualityStatus` snapshot containing backend, level, shadow size,
  and optional-cost flags. Keep normal startup unchanged.

- [ ] **Step 3: Run the complete validation matrix**

  ```bash
  npm run format:check
  npm run lint -- --max-warnings=0
  npm run typecheck
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-quality-final.localstorage' npm run test
  npm run build
  npm run check:bundle
  npm run test:smoke
  git diff --check
  ```

- [ ] **Step 4: Update memory, issue #143, and open the PR**

  Record validation counts and the remaining #142/#145 order, comment on issue
  #143 with the branch/PR link, and open a ready-for-review PR targeting `main`.
