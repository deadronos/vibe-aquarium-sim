# Refactor: Duplication and Module Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove duplicated logic and split oversized modules without changing simulation or rendering behavior.

**Architecture:** Behavior-preserving refactor in five phases: canonical types/helpers -> concentrated duplication (worker buffers, GLSL, debug types, dead code) -> test-fixture consolidation -> large-file decomposition -> full validation. Public exports stay stable via re-exports from original paths.

**Tech Stack:** React 19, React Three Fiber, Three.js, Miniplex ECS, Zustand, TypeScript, Vitest, Playwright, Vite, ESLint, Prettier.

## Global Constraints

- **Physics is Truth:** never mutate `entity.position` manually; queue forces/impulses for Rapier.
- **Zero allocation in loops:** no `new Vector3/Quaternion/Matrix4/Object3D`, `.map`, `.filter`, `Array.from`, object-spread inside `useFrame` or worker/system loops. Reuse module-level variables.
- **Never change behavior:** refactor + MOVE only; no logic edits beyond extracting helpers.
- **Preserve public surface:** keep named exports importable from their original paths (re-export when moving), e.g. `TankCausticsOverlay` is imported by `tests/TankCausticsOverlay.test.tsx`.
- **Per-task gate:** `npm run lint -- --max-warnings=0 && npm run typecheck && npm run test`.
- **Branch:** `refactor/duplication-and-module-split` off `main`.

---

## Phase 0 - Setup

### Task 0: Create branch and baseline

**Files:** none

- [ ] **Step 1:** `git fetch origin && git switch -c refactor/duplication-and-module-split origin/main`
- [ ] **Step 2:** Record baseline: `npm run test -- --maxWorkers=1` (expect the Phase 7 record: ~50 files, 196 tests).
- [ ] **Step 3:** `npm run lint -- --max-warnings=0 && npm run typecheck` both pass.

---

## Phase A - Canonical types and helpers (Tier 4)

### Task 1 (A1): Canonical shared type declarations

**Files:**

- Modify: `src/domain/types.ts` (add `Vec3Like`, `BubbleConfig`)
- Modify: `src/utils/shaderDebug.ts` (export `ShaderLike`; add `ShaderWithProgram = ShaderLike`)
- Modify: `src/utils/rendererPolicy.ts` (export `RendererBackend`; `export type RendererPreference = RendererBackend`)
- Modify: `src/workers/boids/types.ts` (export `Float32Buffer`, `Int32Buffer`)
- Modify: `src/systems/boids/bufferManager.ts:1-2` (import buffers from `workers/boids/types`)
- Modify: `src/components/Tank.tsx:14-18`, `src/shaders/fishLightingMaterial.ts:51-55`, `src/utils/shaderDebug.ts:3-6`
- Modify: `src/gameStore.ts:14-18`, `src/game/feedingActions.ts:9-15` (share `BubbleConfig`)
- Modify: `src/performance/qualityProfile.ts:9` (use `RendererBackend` from rendererPolicy)

**Interfaces:**

- Produces: `Vec3Like { x: number; y: number; z: number }`, `BubbleConfig`, `ShaderLike { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: unknown }> }`, `RendererBackend`, `Float32Buffer`, `Int32Buffer`.

- [ ] **Step 1:** Write `tests/domainTypes.test.ts` additions asserting `DecorationType` and new exports resolve from `src/domain/types`, and `RendererBackend` from `rendererPolicy`.
- [ ] **Step 2:** Run `npx vitest run tests/domainTypes.test.ts` - expect FAIL (missing exports).
- [ ] **Step 3:** Declare each type once; replace duplicates with imports/aliases; use `export type { X }` re-exports where a path must stay stable.
- [ ] **Step 4:** `npx vitest run tests/domainTypes.test.ts && npm run typecheck` - expect PASS; `rg -n "type (ShaderLike|ShaderWithProgram|RendererBackend|DecorationType)" src` shows one definition each.

### Task 2 (A2): Renderer and material helpers

**Files:**

- Modify: `src/utils/rendererPolicy.ts` (add `toRendererBackend(isWebGPU: boolean): RendererBackend`, `setRendererStatus(status: VibeRenderStatus): void`, `createWebGLRendererConfig()`)
- Create: `src/components/materials/materialUtils.ts` (`registerNodeMaterial(name, ctor)`, `resolveThreeColor(c: string | THREE.Color): THREE.Color`, `AXIS_X/Y/Z`, `tslSafeNormalize`)
- Modify: `src/components/materials/{WaterNodeMaterial,ParticleNodeMaterial,TankCausticsNodeMaterial,GlassNodeMaterial}.tsx`
- Modify: `src/SimulationScene.tsx` (use `setRendererStatus`, `toRendererBackend`, `createWebGLRendererConfig`)
- Modify: `src/performance/{AdaptiveQualityManager.tsx,VisualQualityProvider.tsx}`, `src/components/PostProcessing.tsx` (use `toRendererBackend`)

**Interfaces:**

- Consumes: `RendererBackend` (A1).
- Produces: `setRendererStatus`, `resolveThreeColor`.
- Test: `tests/materialUtils.test.ts` - `resolveThreeColor('#fff')` returns `Color` with `r===1`; calling twice with different string/Color yields independent values; `registerNodeMaterial` is idempotent.

- [ ] **Step 1:** Write `tests/materialUtils.test.ts` (failing) against the exported helpers.
- [ ] **Step 2:** `npx vitest run tests/materialUtils.test.ts` - FAIL (module absent).
- [ ] **Step 3:** Implement helpers; replace the 7 `isWebGPU ? 'webgpu' : 'webgl'` sites, the 4 `__vibe_rendererStatus` writes, the redundant `new THREE.Color(c)` ternaries, and per-render `vec3(new Vector3(...))` axes with module-level constants.
- [ ] **Step 4:** `npx vitest run tests/materialUtils.test.ts tests/Water.test.tsx tests/TankCausticsOverlay.test.tsx tests/PostProcessing.test.tsx` - PASS.

### Task 3 (A3): Clamp and shadow-map helpers

**Files:**

- Create: `src/utils/mathUtils.ts` (`clamp(v, min, max)`)
- Modify: `src/utils/boundaryUtils.ts` (add `clampToSimulationBounds(v: number): number`)
- Modify: `src/game/feedingActions.ts:45-46`, `src/components/FeedingController.tsx:33-34`, `src/performance/qualityPresets.ts:30`, `src/domain/species/index.ts:41`
- Modify: `src/performance/AdaptiveQualityManager.tsx:74-90` (extract `applyShadowMapToLight(ref, size)`; call for directional + spot)

- [ ] **Step 1:** Add `tests/mathUtils.test.ts` (failing): `clamp`, `clampToSimulationBounds` at +/-`SIMULATION_BOUNDS` boundaries from `config/constants`.
- [ ] **Step 2:** `npx vitest run tests/mathUtils.test.ts` - FAIL.
- [ ] **Step 3:** Implement and adopt; run `npx vitest run tests/mathUtils.test.ts tests/feedingActions.test.ts tests/AdaptiveQualityManager.test.tsx` - PASS.

**Phase A commit:** `refactor: centralize shared types and math helpers`

---

## Phase B - Concentrated duplication (Tier 1)

### Task 4 (B1): Generic worker simulation-buffer codec

**Files:**

- Create: `src/workers/boids/simulationBuffers.ts`
- Create: `tests/simulationBuffers.test.ts`
- Modify: `src/workers/boids/sharedBuffers.ts`, `src/workers/boids/transferBuffers.ts` (delegate; keep every existing export name/behavior)
- Verify: `src/systems/boids/workerOrchestrator.ts`, `src/workers/boids.worker.ts` compile unchanged.

**Interfaces:**

- Produces (in `simulationBuffers.ts`): `nextCapacity(requested, minimum): number`; `createFloat32(length)`, `createInt32(length)`; `copySimulationInputInto(input, buffers)`; `createSimulationInputFromJob(message, buffers)`; `createSimulationOutputTargetFrom(buffers, fishCount, foodCount, label)`; `createSimulationOutputFrom(buffers, snapshotRevision, fishCount, eatenFoodCount)`; `assertCapacity(fishCount, foodCount, buffers, label)`.
- The shared/transfer modules keep their own `SharedArrayBuffer`/`ArrayBuffer` factories and slot-state functions.

- [ ] **Step 1:** Write `tests/simulationBuffers.test.ts`: capacity growth (`nextCapacity(40,16)===60`), `copySimulationInputInto` copies exactly `fishCount*3` floats, over-capacity throws, `createSimulationOutputFrom` clamps `eatenFoodCount` to `foodCapacity`.
- [ ] **Step 2:** `npx vitest run tests/simulationBuffers.test.ts` - FAIL (module absent).
- [ ] **Step 3:** Implement codec; rewrite the two existing modules to call it. Keep `createTransferSimulationBuffers`/`createSharedSimulationBuffers`, all `ensure*`, `serialize*`, `hydrate*`, `markTransferSlot*`, `releaseTransferSlot`, `invalidateTransferSlot`, and every type export exactly as named.
- [ ] **Step 4:** `npx vitest run tests/simulationBuffers.test.ts tests/sharedBuffers.test.ts tests/transferBuffers.test.ts tests/transferWorkerProtocol.test.ts tests/simulationWorker.test.ts tests/simulationWorker.extra.test.ts tests/workerOrchestrator.test.ts` - PASS, unchanged assertions.
- [ ] **Step 5:** `rg -n "nextCapacity|copySimulationInput" src/workers/boids` shows a single implementation.

### Task 5 (B2): Shared GLSL chunks

**Files:**

- Create: `src/shaders/glsl/common.ts`
- Modify: `src/shaders/causticsShader.ts`, `src/shaders/waterShader.ts`, `src/shaders/waterSurfaceShader.ts`, `src/components/AmbientParticles.tsx`

**Interfaces:**

- Produces string constants: `SIMPLEX_3D_NOISE_GLSL`, `SAFE_NORMALIZE_GLSL`, `TONEMAP_COLORSPACE_INCLUDES`, `EPS_CONST_GLSL`. Injected via `${...}` into each shader template literal.

- [ ] **Step 1:** Add to an existing shader test (`tests/waterShader.test.ts` or nearest): assert each exported shader string contains `snoise` exactly as before and still ends with `#include <colorspace_fragment>`. (No shader content change.)
- [ ] **Step 2:** Run it - PASS on `main` (regression anchor).
- [ ] **Step 3:** Extract the blocks; re-run the shader tests plus `tests/Water.test.tsx tests/TankMaterial.test.tsx tests/fishLightingMaterial.test.tsx tests/AmbientParticles.test.tsx` - PASS.
- [ ] **Step 4:** `rg -c "snoise" src/shaders` - one definition in `glsl/common.ts`.

### Task 6 (B3): Single debug/perf type source

**Files:**

- Modify: `src/declarations.d.ts` (canonical `VibeDebugCollector`, status/entry types, `Window` augmentation)
- Modify: `src/components/DebugHUD.tsx:7-61` (delete local `declare global`; import `Vibe*` types)
- Modify: `src/utils/perfDebug.ts` (export type guards as needed)

**Interfaces:**

- Produces: `VibeRenderStatus`, `VibeSchedStatus`, `VibeDebugCollector`, `VibeSimEntry`, `VibeRenderEntry`, `VibeSchedEntry`, `VibeSchedulerTuningEntry` - imported by `DebugHUD`.

- [ ] **Step 1:** Add `tests/debugTypes.test.ts` type-only test importing the `Vibe*` names from a runtime module re-export (so tsc enforces single source).
- [ ] **Step 2:** `npx vitest run tests/debugTypes.test.ts` - FAIL (names not runtime-exported).
- [ ] **Step 3:** Move declarations into one file; re-export from `src/utils/perfDebug.ts`; delete `DebugHUD` local block.
- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run tests/DebugHUD.test.tsx tests/debugTypes.test.ts` - PASS; `rg -n "interface Window" src` shows a single augmentation.

### Task 7 (B4): Dead code removal

**Files:**

- Modify: `src/utils/rendererUtils.ts` (remove `supportsWebGPU`)
- Modify: `src/utils/effectsBus.ts` (remove `triggerEatingBurst`)
- Modify: `src/components/Tank.tsx:145-165` (remove commented block)
- Delete: `src/workers/simulationWorker.ts`; update imports in `src/systems/boids/workerOrchestrator.ts:1-2` and `src/workers/boids.worker.ts:1`
- Delete: `tests/TankMaterial.test.ts`, `tests/example.test.tsx`
- Modify: `src/systems/fishRender/fishRenderAssets.tsx` (un-export types used only internally: `DeferredFishModelProps`, `DeferredFishModelSlotProps`, `DeferredFishModel`)

- [ ] **Step 1:** `rg -n "supportsWebGPU|triggerEatingBurst|simulationWorker" src tests` confirms only the definitions remain.
- [ ] **Step 2:** Remove/redirect; `npm run typecheck && npm run test` - PASS with no test deletion failures.

**Phase B commit:** `refactor: collapse worker buffers, GLSL chunks, and debug types`

---

## Phase C - Test consolidation (Tier 3)

### Task 8 (C1): Shared SimulationInput fixture

**Files:** Create `tests/support/simulationInput.ts`; modify 8 tests: `workerOrchestrator`, `transferBuffers`, `sharedBuffers`, `simulationWorker`, `simulationWorker.extra`, `transferWorkerProtocol`, `workerTransport.bench`, `speciesSteering`.

**Interfaces:** `createSimulationInput(overrides?: Partial<SimulationInput>): SimulationInput` (defaults: fishCount 2, foodCount 1, N(2,3)=6 float positions, matching velocities, speciesIndices, species/boids/bounds/water/current from `config/constants`).

- [ ] **Step 1:** Create fixture; replace each local builder; `npx vitest run tests/workerOrchestrator.test.ts tests/transferBuffers.test.ts tests/sharedBuffers.test.ts tests/simulationWorker.test.ts tests/simulationWorker.extra.test.ts tests/transferWorkerProtocol.test.ts tests/workerTransport.bench.test.ts tests/speciesSteering.test.ts` - PASS.

### Task 9 (C2): Shared R3F mocks and unmount helper

**Files:** Create `tests/support/r3fMocks.ts` (`createUseFrameMock()`, `createUseGLTFMock()`), `tests/support/fishScenes.ts` (`makeScene(color)`), `tests/support/r3fTestRenderer.ts` (`unmountTestRenderer(renderer)`); modify the 10 tests using `@react-three/fiber` mocks and the 4 using the GLTF mock.

- [ ] **Step 1:** Extract hoisted factories; rewire tests; `npx vitest run tests/FishRenderSystem.adaptive.test.tsx tests/FishRenderSystem.cap.test.tsx tests/FishRenderSystem.loading.test.tsx tests/fishLightingMaterial.test.tsx tests/SchedulerSystem.test.tsx tests/AdaptiveQualityManager.test.tsx tests/TankCausticsOverlay.test.tsx tests/Water.test.tsx tests/PostProcessing.test.tsx tests/TankMaterial.test.tsx tests/components/Fish.physics-hook.test.tsx` - PASS.

### Task 10 (C3): Store/world resets and ResizeObserver in setup

**Files:** Create `tests/support/stores.ts` (`resetWorld`, `resetGameStore`, `resetQualityStore(level?)`, `clearVibeGlobals`); modify `tests/setup.ts` (add `ResizeObserver` via existing `defineGlobalIfMissing`); modify tests listed in scan (remove 8 inline shims; replace reset blocks).

- [ ] **Step 1:** Add shim + helpers; remove duplicates.
- [ ] **Step 2:** `npx vitest run` (full) - PASS; `rg -n "class ResizeObserver" tests` -> 1 (setup only).

**Phase C commit:** `test: consolidate fixtures, R3F mocks, and resets`

---

## Phase D - Module splits (Tier 2)

### Task 11 (D1): Decompose workerOrchestrator.ts (455)

**Files:** Create `src/systems/boids/transportStatus.ts` (`createTransportStatus()`, `publishTransportStatus`, `recordError`), `mainThreadTransport.ts`, `copyTransport.ts`; modify `workerOrchestrator.ts`.

**Interfaces:** status module returns the `VibeTransportStatus` object and `{ publish, recordError }` bound to its `busy` flag. `submitMainThreadJob(input, status, publish)` and `submitClonedJob(input, worker, ...)` receive deps explicitly (no shared fields for these two first).

- [ ] **Step 1:** Extract `transportStatus` + `mainThreadTransport` + `copyTransport` only (stateless seams). Shared/transfer slot logic stays in the class for this task (they own ~8 fields).
- [ ] **Step 2:** `npx vitest run tests/workerOrchestrator.test.ts tests/workerTransport.bench.test.ts tests/transferWorkerProtocol.test.ts` - PASS (unchanged worker behavior).
- [ ] **Step 3 (optional, separate commit):** extract `sharedTransport.ts` + `transferTransport.ts` if tests stay green.

### Task 12 (D2): Decompose workers/boids/index.ts (269)

**Files:** Create `workers/boids/flocking.ts` (`accumulateFlocking(...)` with scalar out-params, reuses `cache.tempSteer`), `outputWriter.ts` (`writeSimulationOutput(...)` from lines 243-268), `params.ts` (`deriveCellSize(species, boids)`); modify `index.ts`.

- [ ] **Step 1:** Extract `params.ts` + `outputWriter.ts` (pure, low risk).
- [ ] **Step 2:** `npx vitest run tests/simulationWorker.test.ts tests/simulationWorker.extra.test.ts tests/speciesSteering.test.ts` - PASS.
- [ ] **Step 3:** Extract the flocking loop body preserving out-params and zero allocations; add a focused `tests/flocking.test.ts` asserting sep/ali/coh accumulation for a 2-fish fixture by comparing to `simulateStep` output.
- [ ] **Step 4:** Re-run worker tests + `rg -n "new (Vector3|Float32Array)|\.map\(|\.filter\(" src/workers/boids/flocking.ts` - no allocations.

### Task 13 (D3): Decompose SimulationScene.tsx (323)

**Files:** Create `src/systems/renderer/rendererBootstrap.ts` (extract 97-157 + fallback 179-201), `src/components/RendererCanvas.tsx` (the `gl` factory, 166-258), `src/components/SceneLights.tsx`, `src/components/AquariumScene.tsx` (262-314); modify `SimulationScene.tsx` to compose (~80 lines).

- [ ] **Step 1:** Extract `SceneLights` verbatim (exported), then `RendererCanvas`, then bootstrap, then `AquariumScene`. Preserve `default export SimulationScene` and `SceneLights` behavior.
- [ ] **Step 2:** `npx vitest run tests/` R3F suites + `npm run typecheck` - PASS; `npm run test:smoke` for renderer selection/fallback.

### Task 14 (D4): Decompose Tank.tsx (257)

**Files:** Create `src/components/tank/tankGeometry.ts` (`createWall`, merged glass geometry, caustics geometry, `BACKPLATE_Z`), `src/components/tank/TankColliders.tsx` (82-118), `src/components/tank/TankCausticsOverlay.tsx` (170-257); modify `Tank.tsx`; keep `export { TankCausticsOverlay }` so the existing test path resolves.

- [ ] **Step 1:** Move geometry builders + colliders + overlay; add `tests/tankGeometry.test.ts` asserting merged geometry has 4 groups and caustics geometry has 5 parts.
- [ ] **Step 2:** `npx vitest run tests/TankMaterial.test.tsx tests/TankCausticsOverlay.test.tsx tests/tankGeometry.test.ts` - PASS.

### Task 15 (D5): Decompose HUD.tsx (314)

**Files:** Create `src/components/ui/hudTime.ts` (`formatTimeAgo`, `getDefaultPanelOpen`), `useHudEntityCounts.ts` (86-94), `useHudShortcuts.ts` (114-162), `HudSection.tsx` (storage-backed `<details>` wrapper), `HudStatsSection.tsx`, `HudPerformanceSection.tsx`, `HudDecorationsSection.tsx`; modify `HUD.tsx`.

- [ ] **Step 1:** Extract helpers + hooks + `HudSection`; replace the 3 duplicated `<details>` blocks. Retain Phase 7 individual Zustand selectors.
- [ ] **Step 2:** `npx vitest run tests/HUD.test.tsx tests/domainTypes.test.ts` - PASS including the render-count isolation test.

### Task 16 (D6): Decompose DebugHUD.tsx (248)

**Files:** Create `src/components/debug/useVibeDebugSnapshot.ts` (`readDebugCounts(dbg)` + 500 ms sampling), `src/components/debug/DebugControls.tsx` (184-241); modify `DebugHUD.tsx`.

- [ ] **Step 1:** Extract; use one `readDebugCounts` in both sampling and `addFish` (removes duplication at 92-99 / 125-133).
- [ ] **Step 2:** `npx vitest run tests/DebugHUD.test.tsx` - PASS.

### Task 17 (D7): Decompose AmbientParticles.tsx (286)

**Files:** Create `src/shaders/ambientParticlesShader.ts` (GLSL 31-104, `mulberry32`, `createParticlesGeometry`), `src/components/particles/ParticleLayer.tsx`, `src/components/particles/useParticleUniforms.ts`; modify `AmbientParticles.tsx`.

- [ ] **Step 1:** Move shader/PRNG/geometry; build one `ParticleLayer` used twice (near/far) with props `{geometry, color, pointSize, opacity, volume, drift, isWebGPU}`; move material/dispose/time wiring into the hook.
- [ ] **Step 2:** `npx vitest run tests/AmbientParticles.test.tsx` - PASS; confirm no per-frame allocation added.

**Phase D commit (per task):** `refactor: split <module>`

---

## Phase E - Final validation

### Task 18 (E): Full gate and plan record

- [ ] **Step 1:** `npm run format:check && npm run lint -- --max-warnings=0 && npm run typecheck && npm run test -- --maxWorkers=1`
- [ ] **Step 2:** `npm run build && npm run check:bundle`
- [ ] **Step 3:** `npm run test:smoke`
- [ ] **Step 4:** `rg -n "new (Vector3|Quaternion|Matrix4|Object3D)|\.map\(|\.filter\(|Array\.from" src/systems src/workers/boids/flocking.ts` - no new hot-loop allocations vs baseline.
- [ ] **Step 5:** Save this plan with executed results; open PR against `main` (`refactor:` prefix) linking the scan.

## Self-review checklist

- [ ] Every Tier 1-4 scan item maps to a task (B1 buffers, B2 GLSL, B3 types, B4 dead code; A1-A3 canonicalizations; C1-C3 tests; D1-D7 splits).
- [ ] No behavior change tasks - all are MOVE/EXTRACT with existing tests or export-parity assertions.
- [ ] Types named consistently across tasks (`RendererBackend`, `ShaderLike`, `createSimulationInput`, `readDebugCounts`).
- [ ] Hot-loop zero-allocation constraint checked explicitly in B2, D2, D7.
- [ ] No placeholders; split tasks cite exact source line ranges.

## Execution record

Executed via subagent-driven development on branch `refactor/duplication-and-module-split`.

- 17 implementation tasks (Tiers 1-4) + validation, each with a task-scoped review.
- Pre-review concerns caught and fixed: Task 5 (waterSurface `1e-12` epsilon),
  Task 9 (mock scene fixture parity), Task 15 (HUD section state ownership),
  Task 17 (ambient particle material lifecycle).
- One reviewed fix round: Task 6 (inert type-level assertions).
- Final gate (all green):
  - `npm run format:check`
  - `npm run lint -- --max-warnings=0`
  - `npx tsc -p tsconfig.app.json --noEmit` (`npm run typecheck` is a pre-existing no-op)
  - `npm run test -- --maxWorkers=1` — 66 files, 287 tests passed
  - `npm run build`
  - `npm run check:bundle` — JS 1,417,513 / 1,700,000 gzip bytes
  - `npm run test:smoke` — 16 passed
- Final whole-branch review: With fixes. Two Important findings fixed:
  - `tests/flocking.test.ts` was circular; now pins a hard-coded expected
    vector captured from base `b8304d2`.
  - No gate type-checked `tests/**` and `tsconfig.vitest.json`'s brace glob
    matched zero inputs; explicit globs + a `typecheck:tests` script were added.
    That script surfaces a pre-existing 103-error legacy backlog (26 files);
    branch-added test modules are clean. Clearing that backlog is a follow-up.
- Deferred (non-blocking) refinements: Task 11 workerOrchestrator split is
  nominal (optional shared/transfer extraction not done); `weights || {}`
  loop allocation preserved; cosmetic type-ergonomics nits in RendererCanvas
  and the material helpers.
