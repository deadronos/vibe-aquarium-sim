# Real Room Reflections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this
> plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reflect the actual living room in tank glass, the water surface, and shiny furniture
without adding a frame-by-frame render pass.

**Architecture:** Capture the real room into a 128² cube target from the tank centre, hide aquarium
contents during the six-face render, and reuse that texture through Three.js environment mapping
and the custom water shader. A scalar scheduler throttles captures to once per five seconds or
slower.

**Tech Stack:** TypeScript, React Three Fiber, Three.js CubeCamera, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-issue-190-room-reflections-design.md`

## Global Constraints

- No frame-loop allocations and no additional scene capture more often than every five seconds.
- Room capture excludes water, glass, fish, aquascape and bubbles.
- No new image assets or third-party dependencies.
- Lite remains functional; the capture is small and infrequent rather than gated by postprocessing.
- Dispose the cube and PMREM targets, dispose the PMREM generator, and restore scene/window
  uniforms when the component unmounts.

## Review Focus

- Initial capture must not self-reflect the tank or run before the exclusion group exists.
- A rapidly changed manual clock must wait for the five-second minimum interval.
- Stable daylight must not keep recapturing every few frames.
- Scene visibility, environment, and water uniforms must be restored even if capture throws.
- A transparent custom water shader must receive a valid shared cube texture before sampling it.

---

### Task 1: Add the reflection scheduler

**Files:**

- Create: `tests/roomReflection.test.ts`
- Create: `src/scene/roomReflection.ts`

**Interfaces:**

- Produces: `RoomReflectionSchedule.needsCapture(now, daylight)` and
  `RoomReflectionSchedule.commit(now, daylight)`.
- Produces: `ROOM_REFLECTION_INTERVAL_SECONDS = 5`.

- [x] **Step 1: Write the failing scheduler tests**

  Prove initial capture is due, stable lighting is not due after the first commit, a meaningful sun
  or lamp change is throttled until five seconds, and an accepted capture commits the new state.

- [x] **Step 2: Run the focused test**

  Run: `npm run test -- tests/roomReflection.test.ts`

  Expected: FAIL because `src/scene/roomReflection.ts` is missing.

- [x] **Step 3: Implement allocation-free daylight signature checks**

  Compare scalar direction, colour channel, intensity and lamp values to fixed thresholds and mutate
  only the scheduler's stored fields.

- [x] **Step 4: Verify the focused test**

  Run: `npm run test -- tests/roomReflection.test.ts`

  Expected: PASS.

### Task 2: Add water reflection sampling

**Files:**

- Modify: `tests/roomReflection.test.ts`
- Modify: `src/scene/tank/underwater.ts`
- Modify: `src/scene/tank/WaterSurface.tsx`

**Interfaces:**

- Consumes: one shared `waterUniforms.uRoomReflection` cube texture.
- Produces: `createWaterSurfaceMaterial()` with ripple-distorted cubemap reflection sampling.

- [x] **Step 1: Add a failing shader contract test**

  Require `createWaterSurfaceMaterial()` to reference the shared reflection uniform and sample
  `uRoomReflection` with a reflected view direction.

- [x] **Step 2: Run the focused test**

  Run: `npm run test -- tests/roomReflection.test.ts`

  Expected: FAIL because the factory/uniform is absent.

- [x] **Step 3: Implement shared cubemap sampling**

  Keep the existing water glints and underside colour, add a small perturbed normal, and mix a
  cubemap reflection into the visible surface without changing opacity semantics.

- [x] **Step 4: Verify the focused test**

  Run: `npm run test -- tests/roomReflection.test.ts`

  Expected: PASS.

### Task 3: Capture the real room environment

**Files:**

- Create: `src/scene/RoomReflectionEnvironment.tsx`
- Modify: `src/scene/Experience.tsx`
- Modify: `src/scene/Lights.tsx`

**Interfaces:**

- Consumes: `RoomReflectionSchedule`, `waterUniforms.uRoomReflection`, and the named aquarium
  exclusion group.
- Produces: one `WebGLCubeRenderTarget` assigned to `scene.environment` and shared with water.

- [x] **Step 1: Remove the Lightformer proxy and add the capture component**

  Create a 128² `CubeCamera` at tank height, hide the tank group only during `cubeCamera.update`,
  restore it in `finally`, own and reuse the PMREM output, precompile the environment-aware
  programs before readiness, and dispose/restore resources on unmount.

- [x] **Step 2: Verify type and unit behavior**

  Run: `npm run typecheck && npm run test`

  Expected: PASS.

### Task 4: Validate visual and performance behavior

**Files:**

- Modify: `docs/agents/performance.md`
- Modify: `docs/performance/rendering-baseline.md`
- Modify: `memory/activeContext.md`
- Modify: `memory/progress.md`
- Modify: `scratch.md`

- [x] **Step 1: Run the standard repository gate**

  Run:
  `npm run format && npm run lint -- --max-warnings=0 && npm run typecheck && npm run test &&`
  `npm run build && npm run check:bundle && npm run test:smoke`

  Expected: all commands exit 0.

- [x] **Step 2: Inspect reflections**

  Capture before/after Sofa and Up close views and verify the room window/lamp appear in front
  glass while water reflects the same room environment.

- [x] **Step 3: Verify throttling and Lite performance**

  Run the Lite renderer benchmark and compare with the previous baseline. Confirm a stable scene
  does not recapture more than once per five seconds.

- [ ] **Step 4: Review and hand off**

  Run fresh code review, fix actionable findings, push the branch and open a PR that closes #190.
