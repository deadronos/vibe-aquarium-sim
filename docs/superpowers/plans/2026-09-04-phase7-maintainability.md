# Phase 7 Maintainability and Project Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the fish renderer behind its existing public facade, consolidate shared domain types, narrow HUD subscriptions, and make project metadata/docs/runtime diagnostics accurate without changing simulation behavior.

**Architecture:** Keep `FishRenderSystem` as the only public renderer component and move asset lifecycle, preallocated render state, frame updates, and diagnostics into focused modules. Put `DecorationType` in one shared type module, use field/action selectors in `HUD`, and enforce shell hygiene with static tests plus browser smoke checks.

**Tech Stack:** React 19, React Three Fiber, Three.js, Miniplex ECS, Zustand, TypeScript, Vitest, Playwright, Vite, ESLint, Prettier.

---

## File map and implementation order

| Unit                | Files                                                                                                                                                            | Responsibility                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pooled render state | Create `src/systems/fishRender/fishRenderPools.ts`; test `tests/fishRenderPools.test.ts`                                                                         | Fixed-size matrices, quaternions, dirty flags, active-entity arrays, and reset semantics; no React imports                           |
| Frame updater       | Create `src/systems/fishRender/fishRenderInstances.ts`; test `tests/fishRenderInstances.test.ts`                                                                 | Query fish, resolve available models, write pooled transforms, release stale orientations, enforce caps, and flush adaptive matrices |
| Diagnostics         | Create `src/systems/fishRender/fishRenderDiagnostics.ts`; test `tests/fishRenderDiagnostics.test.ts`                                                             | Optional timing/EMA and guarded `window.__vibe_renderStatus` publication                                                             |
| Asset lifecycle     | Create `src/systems/fishRender/fishRenderAssets.tsx`; test additions in `tests/FishRenderSystem.loading.test.tsx`                                                | Deferred Suspense slots, timeout/error settlement, status, and availability callbacks                                                |
| Facade              | Modify `src/systems/FishRenderSystem.tsx`                                                                                                                        | Owns hooks/refs, uniforms, meshes, and one `useFrame`; delegates to focused units                                                    |
| Shared domain type  | Create `src/domain/types.ts`; modify `src/store.ts`, `src/gameStore.ts`, `src/components/Decoration.tsx`, `src/components/ui/HUD.tsx`, and any remaining imports | Single `DecorationType` declaration with compatibility re-export from `store.ts`                                                     |
| HUD subscriptions   | Modify `src/components/ui/HUD.tsx`; test `tests/HUD.test.tsx`                                                                                                    | Individual Zustand selectors with stable primitive/action references                                                                 |
| Project hygiene     | Modify `README.md`, `index.html`; create `tests/projectHygiene.test.ts` and, only if needed, `docs/agents/runtime-warnings.md`                                   | Current paths, metadata, relative favicon, no stale `/vite.svg`, and evidence-backed warning tracking                                |

The implementation order is dependency-upward: pools → frame updater → diagnostics/assets → facade wiring → domain/UI → docs/shell. Each task below ends with a small commit so the branch stays reviewable.

### Task 1: Add and implement pooled render state

**Files:**

- Create: `tests/fishRenderPools.test.ts`
- Create: `src/systems/fishRender/fishRenderPools.ts`

- [ ] **Step 1: Write the failing pool contract test.**

```ts
import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion } from 'three';
import {
  MAX_INSTANCES_PER_MODEL,
  QUATERNION_POOL_SIZE,
  createFishRenderState,
  resetFishRenderState,
} from '../src/systems/fishRender/fishRenderPools';

describe('fish render pooled state', () => {
  it('creates fixed-size model pools and empty frame collections', () => {
    const state = createFishRenderState();

    expect(state.matrixPools).toHaveLength(3);
    expect(state.matrixPools.every((pool) => pool.length === MAX_INSTANCES_PER_MODEL)).toBe(true);
    expect(state.matrixPools[0]?.[0]).toBeInstanceOf(Matrix4);
    expect(state.quaternionPool).toHaveLength(QUATERNION_POOL_SIZE);
    expect(state.quaternionPool[0]).toBeInstanceOf(Quaternion);
    expect(state.quaternionFreeTop).toBe(QUATERNION_POOL_SIZE);
    expect(state.activeEntities).toHaveLength(0);
    expect(state.previousEntities).toHaveLength(0);
  });

  it('resets pooled entity bookkeeping and free-list state without reallocating arrays', () => {
    const state = createFishRenderState();
    const activeEntities = state.activeEntities;
    const previousEntities = state.previousEntities;
    activeEntities.push({
      __vibeFishQuatIndex: 4,
      __vibeFishSeenFrame: 2,
      __vibeFishRenderedFrame: 2,
    });
    previousEntities.push({
      __vibeFishQuatIndex: 8,
      __vibeFishSeenFrame: 1,
      __vibeFishRenderedFrame: 1,
    });
    state.quaternionFreeTop = 0;

    resetFishRenderState(state);

    expect(state.activeEntities).toBe(activeEntities);
    expect(state.previousEntities).toBe(previousEntities);
    expect(activeEntities).toHaveLength(0);
    expect(previousEntities).toHaveLength(0);
    expect(state.quaternionFreeTop).toBe(QUATERNION_POOL_SIZE);
    expect(state.quaternionFreeList[0]).toBe(0);
    expect(state.quaternionFreeList[QUATERNION_POOL_SIZE - 1]).toBe(QUATERNION_POOL_SIZE - 1);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the new module is absent.**

Run: `npx vitest run tests/fishRenderPools.test.ts`

Expected: FAIL with a module-resolution error for `src/systems/fishRender/fishRenderPools`.

- [ ] **Step 3: Implement the minimal allocation-owned state module.**

Use `MAX_INSTANCES_PER_MODEL` from `../instanceCapWarning`, allocate all arrays and Three.js objects once in `createFishRenderState`, and expose a reset that clears entity bookkeeping and repopulates the existing `Int32Array` free list. Define the exact state shape used by later tasks:

```ts
export const QUATERNION_POOL_SIZE = MAX_INSTANCES_PER_MODEL * 3;

export type FishRenderState = {
  frameId: number;
  elapsedTime: number;
  activeEntities: Entity[];
  previousEntities: Entity[];
  quaternionPool: Quaternion[];
  quaternionFallback: Quaternion;
  quaternionFreeList: Int32Array;
  quaternionFreeTop: number;
  matrixPools: [Matrix4[], Matrix4[], Matrix4[]];
  dirty: [Uint8Array, Uint8Array, Uint8Array];
  nextFlush: [number, number, number];
  instanceUpdateEma: number;
  updateFrequency: number;
  renderStatus: { updateFreq: number; ema: number; activeEntities: number; frameDuration: number };
};

export function createFishRenderState(): FishRenderState;
export function resetFishRenderState(state: FishRenderState): void;
```

Keep `Matrix4`, `Quaternion`, and `Object3D` scratch objects out of this state; the frame updater will own its module-level scratch objects so they are shared and never recreated per frame.

- [ ] **Step 4: Run the focused test and formatting check.**

Run: `npx vitest run tests/fishRenderPools.test.ts && npx prettier --check src/systems/fishRender/fishRenderPools.ts tests/fishRenderPools.test.ts`

Expected: both commands pass.

- [ ] **Step 5: Commit the pooled-state unit.**

```bash
git add src/systems/fishRender/fishRenderPools.ts tests/fishRenderPools.test.ts
git commit -m "refactor: isolate fish render pooled state"
```

### Task 2: Extract the allocation-free frame updater

**Files:**

- Create: `tests/fishRenderInstances.test.ts`
- Create: `src/systems/fishRender/fishRenderInstances.ts`
- Modify: `src/systems/fishRender/fishRenderPools.ts` only if the updater needs a shared type export

- [ ] **Step 1: Write failing tests for model fallback, cap handling, and stale-pool release.**

Use real `World<Entity>` instances and real `InstancedMesh` objects in the test; inject the existing `world.with('isFish', 'position', 'velocity')` query through the function context so the function is deterministic and does not create a query in the frame callback. The test contract is:

```ts
import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, MeshBasicMaterial, InstancedMesh, Vector3 } from 'three';
import { world } from '../src/store';
import { createFishRenderState } from '../src/systems/fishRender/fishRenderPools';
import { updateFishInstances } from '../src/systems/fishRender/fishRenderInstances';

const makeMesh = () => new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial(), 1000);

describe('fish render instance updater', () => {
  it('falls back to the primary mesh when a requested variant is unavailable', () => {
    world.entities.length = 0;
    const entity = world.add({
      isFish: true,
      modelIndex: 2,
      position: new Vector3(1, 2, 3),
      velocity: new Vector3(1, 0, 0),
    });
    const state = createFishRenderState();
    const primary = makeMesh();
    const variantOne = makeMesh();
    const variantTwo = makeMesh();

    updateFishInstances({
      state,
      meshes: [primary, variantOne, variantTwo],
      available: [true, false, false],
      adaptiveEnabled: false,
      debug: undefined,
      delta: 1 / 60,
    });

    expect(primary.count).toBe(1);
    expect(variantTwo.count).toBe(0);
    expect(entity.__vibeFishRenderedFrame).toBe(state.frameId);
    world.entities.length = 0;
  });

  it('releases orientation slots when an entity leaves the query', () => {
    world.entities.length = 0;
    const entity = world.add({
      isFish: true,
      position: new Vector3(),
      velocity: new Vector3(1, 0, 0),
    });
    const state = createFishRenderState();
    const meshes: [InstancedMesh, InstancedMesh, InstancedMesh] = [
      makeMesh(),
      makeMesh(),
      makeMesh(),
    ];
    updateFishInstances({
      state,
      meshes,
      available: [true, true, true],
      adaptiveEnabled: false,
      debug: undefined,
      delta: 1 / 60,
    });
    const slot = entity.__vibeFishQuatIndex;
    world.remove(entity);
    updateFishInstances({
      state,
      meshes,
      available: [true, true, true],
      adaptiveEnabled: false,
      debug: undefined,
      delta: 1 / 60,
    });

    expect(entity.__vibeFishQuatIndex).toBeUndefined();
    expect(state.quaternionFreeTop).toBeGreaterThan(0);
    expect(slot).toBeGreaterThanOrEqual(-1);
    world.entities.length = 0;
  });

  it('marks overflow fish as unrendered and warns through the existing cap helper', () => {
    world.entities.length = 0;
    for (let i = 0; i < 1001; i++)
      world.add({ isFish: true, position: new Vector3(i, 0, 0), velocity: new Vector3(1, 0, 0) });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = createFishRenderState();
    updateFishInstances({
      state,
      meshes: [makeMesh(), makeMesh(), makeMesh()],
      available: [true, false, false],
      adaptiveEnabled: false,
      debug: undefined,
      delta: 1 / 60,
    });

    expect(state.activeEntities).toHaveLength(1001);
    expect(state.activeEntities[1000]?.__vibeFishRenderedFrame).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('MAX_INSTANCES_PER_MODEL'));
    warn.mockRestore();
    world.entities.length = 0;
  });
});
```

- [ ] **Step 2: Run the focused tests and verify they fail because the updater is absent.**

Run: `npx vitest run tests/fishRenderInstances.test.ts`

Expected: FAIL with a module-resolution error for `fishRenderInstances`.

- [ ] **Step 3: Implement the updater with the existing semantics.**

Export the exact context and function shape below. Move the current query loop, pooled quaternion assignment, model fallback, cap warning, stale-entity cleanup, mesh counts, direct writes, and adaptive `flushDirtyInstanceMatrices` calls into this function. Keep `Object3D`, `Vector3`, `Quaternion`, and `FORWARD` module-level singletons. Do not call `new`, `Array.from`, `.map`, `.filter`, or object-spread in `updateFishInstances`.

```ts
export type FishRenderMeshes = [InstancedMesh, InstancedMesh | null, InstancedMesh | null];

export type FishRenderInstanceContext = {
  state: FishRenderState;
  meshes: FishRenderMeshes;
  available: readonly [boolean, boolean, boolean];
  adaptiveEnabled: boolean;
  debug: VibeDebugCollector | undefined;
  delta: number;
};

export function updateFishInstances(context: FishRenderInstanceContext): void;
```

Increment `state.frameId`, add `delta` to `state.elapsedTime`, update all three uniform arrays before returning to the facade, and preserve the existing `try/catch` around diagnostics/flush work so telemetry cannot interrupt visuals. The facade will pass uniform arrays separately if keeping uniform updates outside the updater makes the no-allocation boundary clearer; whichever choice is made must be covered by the unchanged adaptive tests.

- [ ] **Step 4: Run the focused updater tests and all existing fish frame tests.**

Run: `npx vitest run tests/fishRenderInstances.test.ts tests/FishRenderSystem.adaptive.test.tsx tests/FishRenderSystem.cap.test.tsx tests/FishRenderSystem.flush.test.ts`

Expected: PASS, with adaptive direct-write and bounded-flush assertions unchanged.

- [ ] **Step 5: Commit the frame updater extraction.**

```bash
git add src/systems/fishRender/fishRenderInstances.ts tests/fishRenderInstances.test.ts src/systems/fishRender/fishRenderPools.ts
git commit -m "refactor: extract fish instance update loop"
```

### Task 3: Extract diagnostics and asset lifecycle, then wire the facade

**Files:**

- Create: `tests/fishRenderDiagnostics.test.ts`
- Create: `src/systems/fishRender/fishRenderDiagnostics.ts`
- Create: `src/systems/fishRender/fishRenderAssets.tsx`
- Modify: `src/systems/FishRenderSystem.tsx`
- Modify: `tests/FishRenderSystem.loading.test.tsx` only for new exported helper coverage if needed

- [ ] **Step 1: Write failing diagnostics and timeout tests.**

Add a pure diagnostics contract test that calls `publishFishRenderStatus` with a fake debug object and asserts the status fields are updated, then calls it with a throwing debug collector and asserts no exception escapes. Add a loading test for an optional model timeout using fake timers and the existing `window.__vibe_fishAssetStatus` contract.

```ts
it('publishes status only when diagnostics are enabled', () => {
  const status = { updateFreq: 1, ema: 0, activeEntities: 0, frameDuration: 0 };
  const debug = {
    fishRender: [],
  } as unknown as VibeDebugCollector;

  publishFishRenderStatus(status, debug, {
    updateFreq: 2,
    ema: 1.5,
    activeEntities: 4,
    frameDuration: 0.5,
  });

  expect(debug.fishRender).toHaveLength(1);
  expect(window.__vibe_renderStatus).toEqual(status);
});
```

- [ ] **Step 2: Run the new tests and verify they fail because the diagnostics module and timeout assertion are absent.**

Run: `npx vitest run tests/fishRenderDiagnostics.test.ts tests/FishRenderSystem.loading.test.tsx -t "publishes status|times out"`

Expected: diagnostics import failure and a missing timeout test implementation.

- [ ] **Step 3: Implement diagnostics helpers with guarded global publication.**

Expose these exact functions and keep all diagnostic writes inside `try/catch`:

```ts
export type FishRenderStatus = {
  updateFreq: number;
  ema: number;
  activeEntities: number;
  frameDuration: number;
};

export function recordFishRenderTiming(
  previousEma: number,
  frameDuration: number,
  alpha?: number
): number;

export function publishFishRenderStatus(
  status: FishRenderStatus,
  debug: VibeDebugCollector | undefined,
  sample: FishRenderStatus & {
    frame: number;
    counts?: { countA: number; countB: number; countC: number };
    flushed?: number;
  }
): void;

export function clearFishRenderStatus(): void;
```

`recordFishRenderTiming` must preserve the current `0.06` EMA behavior. `publishFishRenderStatus` must push the same fields currently pushed to `window.__vibe_debug.fishRender`, assign `window.__vibe_renderStatus` only when debug is enabled, and delete the global when disabled. `clearFishRenderStatus` must only delete the project-owned global.

- [ ] **Step 4: Move deferred asset slots into `fishRenderAssets.tsx`.**

Move `DeferredFishModel`, `DeferredFishModelSlot`, the timeout constant, and their error boundary wiring without changing rendered children or callback order. Export the slot component only for the facade and keep `FishModelMesh` as the model/material boundary. Preserve the rules: primary model loads first, variant one gates variant two, errors/timeouts settle variants, and the primary remains authoritative.

- [ ] **Step 5: Replace the monolith with a facade that owns hooks and delegates work.**

In `FishRenderSystem.tsx`, retain the existing imports used by `SimulationScene`, `FishModelMesh`, `MODEL_URLS`, and tests. Replace local helper implementations with imports from `fishRenderPools`, `fishRenderInstances`, `fishRenderDiagnostics`, and `fishRenderAssets`. Create the pooled state once with `useMemo(() => createFishRenderState(), [])`; reset it in the existing unmount cleanup effect. Keep exactly one `useFrame` callback and pass the current refs/availability/quality flags into `updateFishInstances`.

The returned JSX remains equivalent:

```tsx
<FishModelMesh modelIndex={0} ... />
{primaryReady && <DeferredFishModelSlot modelIndex={1} ... />}
{variantOneSettled && <DeferredFishModelSlot modelIndex={2} ... />}
```

- [ ] **Step 6: Run the complete fish-render test group and inspect the frame path.**

Run: `npx vitest run tests/FishRenderSystem.test.ts tests/FishRenderSystem.adaptive.test.tsx tests/FishRenderSystem.cap.test.tsx tests/FishRenderSystem.flush.test.ts tests/FishRenderSystem.loading.test.tsx tests/fishRenderDiagnostics.test.ts tests/fishRenderInstances.test.ts tests/fishRenderPools.test.ts`

Expected: PASS; `rg -n "new (Vector3|Quaternion|Matrix4|Object3D)|\.map\(|\.filter\(|Array\.from|{\.\.\." src/systems/fishRender src/systems/FishRenderSystem.tsx` reports no new per-frame allocations in the updater.

- [ ] **Step 7: Commit the renderer facade extraction.**

```bash
git add src/systems/FishRenderSystem.tsx src/systems/fishRender tests/FishRenderSystem.loading.test.tsx tests/fishRenderDiagnostics.test.ts
git commit -m "refactor: decompose fish render system responsibilities"
```

### Task 4: Consolidate the domain type and narrow HUD subscriptions

**Files:**

- Create: `tests/domainTypes.test.ts`
- Modify: `src/domain/types.ts`, `src/store.ts`, `src/gameStore.ts`, `src/components/Decoration.tsx`, `src/components/ui/HUD.tsx`
- Modify: `tests/HUD.test.tsx`

- [ ] **Step 1: Write a failing type-ownership and render-count regression test.**

Add a type-only import test that imports `DecorationType` from the shared module and keeps `store.ts` as a compatibility re-export. In `tests/HUD.test.tsx`, wrap `<HUD />` in a `Profiler`, change only `pendingEffects` through `useGameStore.setState`, and assert the HUD commit count does not increase; then change `isPlacingDecoration` and assert the callout updates.

```tsx
it('does not rerender for unrelated game-store state', () => {
  const commits: string[] = [];
  render(
    <Profiler id="hud" onRender={() => commits.push('commit')}>
      <HUD />
    </Profiler>
  );
  const initialCommits = commits.length;

  act(() =>
    useGameStore.setState({
      pendingEffects: [{ type: 'ripple', position: { x: 0, y: 0, z: 0 }, id: 'unrelated' }],
    })
  );
  expect(commits).toHaveLength(initialCommits);

  act(() => useGameStore.setState({ isPlacingDecoration: true }));
  expect(commits.length).toBeGreaterThan(initialCommits);
  expect(document.querySelector('.hud-callout')).toHaveTextContent('Click tank floor to place');
});
```

- [ ] **Step 2: Run the focused tests and verify the selector test fails with the current full-store subscription.**

Run: `npx vitest run tests/HUD.test.tsx tests/domainTypes.test.ts`

Expected: the render-count assertion fails because `HUD` currently subscribes to the entire game store, and the shared module import fails until created.

- [ ] **Step 3: Add the single shared type and compatibility re-export.**

Create `src/domain/types.ts` with exactly:

```ts
export type DecorationType = 'seaweed' | 'coral' | 'rock';
```

Replace the duplicate union in `gameStore.ts` with `import type { DecorationType } from './domain/types';`, and in `store.ts` use `export type { DecorationType } from './domain/types';` plus a local type import for `Entity`. Update `Decoration.tsx` and `HUD.tsx` to import from `../../domain/types` / `../../domain/types` as appropriate. Finish with `rg -n "type DecorationType" src` and verify only the domain file declares it.

- [ ] **Step 4: Replace `useGameStore()` object destructuring with individual selectors.**

Use one selector per field/action so no selector allocates an object:

```ts
const lastFedTime = useGameStore((state) => state.lastFedTime);
const isPlacingDecoration = useGameStore((state) => state.isPlacingDecoration);
const selectedDecorationType = useGameStore((state) => state.selectedDecorationType);
const startPlacingDecoration = useGameStore((state) => state.startPlacingDecoration);
const stopPlacingDecoration = useGameStore((state) => state.stopPlacingDecoration);
```

Preserve all callback dependencies and keyboard behavior; do not use a new object selector or shallow-comparison workaround.

- [ ] **Step 5: Run HUD/type tests and commit.**

Run: `npx vitest run tests/HUD.test.tsx tests/domainTypes.test.ts && npx tsc --noEmit`

Expected: PASS, with no duplicate `DecorationType` declaration.

```bash
git add src/domain/types.ts src/store.ts src/gameStore.ts src/components/Decoration.tsx src/components/ui/HUD.tsx tests/HUD.test.tsx tests/domainTypes.test.ts
git commit -m "refactor: share decoration types and narrow HUD subscriptions"
```

### Task 5: Repair README, HTML metadata, and warning hygiene

**Files:**

- Create: `tests/projectHygiene.test.ts`
- Modify: `README.md`
- Modify: `index.html`
- Create only when required by smoke evidence: `docs/agents/runtime-warnings.md`

- [ ] **Step 1: Write failing static hygiene tests.**

Read files with `node:fs` relative to `process.cwd()` and assert the README does not mention the removed WaterResistance path, every `src/...` path listed in the module map exists, the HTML includes required metadata, and neither HTML nor README references `/vite.svg`.

```ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

describe('project hygiene', () => {
  it('contains no removed renderer paths in the README', () => {
    expect(read('README.md')).not.toContain('src/systems/WaterResistanceSystem.tsx');
  });

  it('keeps the HTML shell base-path safe and descriptive', () => {
    const html = read('index.html');
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
    expect(html).toMatch(/<meta name="theme-color" content="#[0-9a-fA-F]{6}"/);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).not.toContain('/vite.svg');
    expect(html).toContain('href="favicon.svg"');
    expect(existsSync(resolve(root, 'public/favicon.svg'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the hygiene tests and verify the stale README assertion fails.**

Run: `npx vitest run tests/projectHygiene.test.ts`

Expected: FAIL on the existing `WaterResistanceSystem.tsx` reference and any missing metadata assertions.

- [ ] **Step 3: Update the README module map from the actual file inventory.**

Replace the removed `WaterResistanceSystem.tsx` bullet with the current water/physics implementation path found by `rg --files src`, retain `src/utils/FixedStepScheduler.ts`, and ensure every path in the “Important files / starting points” section resolves from the repository root. Do not rewrite unrelated project history or usage instructions.

- [ ] **Step 4: Add metadata without root-path assumptions.**

Keep the existing relative favicon link and add the following tags using the project’s final title/description:

```html
<meta name="description" content="A relaxing, physics-based aquarium simulation." />
<meta name="theme-color" content="#071b2b" />
<meta property="og:title" content="Vibe Aquarium" />
<meta property="og:description" content="A relaxing, physics-based aquarium simulation." />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary" />
```

Do not add `/vite.svg`, root-relative GLB URLs, or a canonical URL that hard-codes a deployment host. Verify the existing Vite base handling remains untouched.

- [ ] **Step 5: Reproduce and classify browser warnings.**

Run `npm run dev -- --host 127.0.0.1`, execute `npm run test:smoke` against the configured Playwright base URL, and inspect captured console messages. Fix warnings caused by local code. If a warning is emitted by Three.js, Rapier, or another dependency and cannot be fixed without an upgrade outside Phase 7, create `docs/agents/runtime-warnings.md` with the exact package version, message, reproduction command, upstream link, and removal condition. Do not weaken the smoke test’s page-error or 404 assertions.

- [ ] **Step 6: Run hygiene tests and commit the shell/docs changes.**

Run: `npx vitest run tests/projectHygiene.test.ts && npx prettier --check README.md index.html tests/projectHygiene.test.ts`

Expected: PASS with no stale path or metadata failures.

```bash
git add README.md index.html tests/projectHygiene.test.ts
if [ -f docs/agents/runtime-warnings.md ]; then git add docs/agents/runtime-warnings.md; fi
git commit -m "docs: clean project metadata and module references"
```

### Task 6: Full validation, review, and handoff

**Files:**

- Modify: `docs/superpowers/plans/2026-09-04-phase7-maintainability.md` only to mark completed checkboxes and record observed validation results
- Modify: `docs/agents/runtime-warnings.md` only if the warning ledger changes during validation

- [ ] **Step 1: Run formatting, lint, typecheck, and the full Vitest suite.**

Run:

```bash
npm run format:check
npm run lint -- --max-warnings=0
npm run typecheck
npm run test
```

Expected: all commands exit 0 with no ESLint warnings.

- [ ] **Step 2: Build and verify the bundle budget.**

Run:

```bash
npm run build
npm run check:bundle
git diff --check
```

Expected: production build and bundle budget pass; `git diff --check` reports no whitespace errors.

- [ ] **Step 3: Run browser smoke and inspect the deployed-style shell.**

Run: `npm run test:smoke`

Expected: WebGL selection/fallback, asset loading, mobile shell, worker transport, zero page errors, and zero HTTP 404 responses all pass. Confirm the browser console matches the warning ledger, if one exists.

- [ ] **Step 4: Perform a focused diff review.**

Run:

```bash
git diff main...HEAD --stat
git diff main...HEAD -- src/systems/FishRenderSystem.tsx src/systems/fishRender src/components/ui/HUD.tsx src/store.ts src/gameStore.ts index.html README.md
rg -n "new (Vector3|Quaternion|Matrix4|Object3D)|\.map\(|\.filter\(|Array\.from" src/systems/fishRender
rg -n "type DecorationType" src
```

Expected: the facade remains the public import, no new frame-loop allocations appear, and only `src/domain/types.ts` declares the union.

- [ ] **Step 5: Update the plan checkboxes, commit validation notes, and prepare the PR.**

Record the exact commands and outcomes in the plan’s validation section, then create the PR against `main` with:

```text
Goal: Complete Phase 7 maintainability and project hygiene from #149.
Key changes: facade-preserving fish renderer extraction; shared decoration type; selective HUD subscriptions; README/index metadata cleanup; warning evidence.
Validation: format, lint, typecheck, Vitest, build, bundle budget, and Playwright smoke.
```

Link the design spec, issue #149, and any warning ledger. Do not merge until CI is green and the owner explicitly approves the PR.

## Self-review checklist

- [x] Requirements 1–5 from the approved design each map to one or more tasks.
- [x] Every new production unit begins with a failing test or a preserved regression test.
- [x] The plan keeps the public renderer export and `store.ts` type import compatible.
- [x] The hot-loop constraint is checked by static search and the existing adaptive tests.
- [x] The warning ledger is conditional on smoke evidence rather than invented in advance.
- [x] No unresolved task marker or placeholder instruction appears in the plan.
