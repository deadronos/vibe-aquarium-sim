# Issue 146: Cohesive Aquarium Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the aquarium read as one calm, cinematic visual world with fish-first contrast, coherent low-poly decor, deterministic floor clusters, and equivalent WebGL/WebGPU art direction.

**Architecture:** Add a renderer-independent `artDirection` module containing named palette, light, water, and composition constants plus pure helpers for deterministic decoration/fish spawn descriptors. Components consume those values without changing the ECS/physics source-of-truth loop. Existing quality flags remain the cost-control boundary; they change optional detail, not the base palette or composition.

**Tech Stack:** React 19, React Three Fiber, Three.js, drei, Rapier, Vitest, Playwright, TypeScript.

---

## File map

- Create `src/config/artDirection.ts`: named palette, material values, light values, and pure deterministic layout helpers.
- Modify `src/components/LivingRoom.tsx`: quiet warm room, stand, floor, and framing prop using shared values.
- Modify `src/components/Decoration.tsx`: shared matte material language and low-poly natural forms with bounded prop variation.
- Modify `src/systems/Spawner.tsx`: deterministic fish opening layout and clustered decor descriptors; preserve random dynamic add-fish behavior.
- Modify `src/components/Tank.tsx`: shared glass/floor/caustics values and lower additive emphasis.
- Modify `src/components/Water.tsx`: shared deep-water palette and restrained surface/volume defaults in both shader branches.
- Modify `src/components/materials/WaterNodeMaterial.tsx`: mirror the WebGL water palette and strength changes in TSL.
- Modify `src/components/materials/TankCausticsNodeMaterial.tsx`: mirror the WebGL caustics strength/color changes in TSL.
- Modify `src/SimulationScene.tsx`: shared background, warm/cool lighting hierarchy, and environment intensity.
- Modify `tests/artDirection.test.ts`: pure palette and composition contracts.
- Modify `tests/e2e/smoke.spec.ts`: collect deterministic visual diagnostics and screenshot artifacts without making tests renderer-fragile.
- Modify `memory/designs/_index.md`, `memory/tasks/_index.md`, `memory/activeContext.md`, and `memory/progress.md`: record DES016/TASK018 and handoff state.

## Validation commands

Run from `/Users/openclaw/.config/superpowers/worktrees/vibe-aquarium-sim/issue-146-cohesive-visuals`:

```bash
npm test tests/artDirection.test.ts
npm run format
npm run lint -- --max-warnings=0
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run test:smoke
git diff --check
```

The preview smoke must be run against the production build using the repository’s existing Playwright configuration. Capture a desktop screenshot and inspect a narrow viewport screenshot for tank focal point, fish silhouette separation, decoration palette, and absence of page errors.

### Task 1: Add test-first art direction contracts

**Files:**

- Create: `src/config/artDirection.ts`
- Create: `tests/artDirection.test.ts`

- [ ] **Step 1: Write the failing tests**

Define the public pure API expected by the rest of the work:

```ts
import {
  AQUARIUM_PALETTE,
  DECORATION_CLUSTERS,
  getDecorationSpawnDescriptors,
  getInitialFishSpawn,
} from '../src/config/artDirection';

describe('aquarium art direction', () => {
  test('exposes a dark teal water palette and a restrained warm accent', () => {
    expect(AQUARIUM_PALETTE.waterDeep).toBe('#123b43');
    expect(AQUARIUM_PALETTE.waterSurface).toBe('#1d5960');
    expect(AQUARIUM_PALETTE.coral).toBe('#c87862');
    expect(AQUARIUM_PALETTE.roomWall).not.toBe('#808080');
  });

  test('returns deterministic clustered decor with a clear central swim lane', () => {
    const first = getDecorationSpawnDescriptors();
    const second = getDecorationSpawnDescriptors();
    expect(first).toEqual(second);
    expect(first).toHaveLength(
      DECORATION_CLUSTERS.reduce((sum, cluster) => sum + cluster.items.length, 0)
    );
    expect(first.every(({ x }) => Math.abs(x) >= 0.42)).toBe(true);
  });

  test('spreads the default fish opening across the tank and cycles model indices', () => {
    const fish = Array.from({ length: 30 }, (_, index) => getInitialFishSpawn(index, 30));
    expect(new Set(fish.map(({ modelIndex }) => modelIndex))).toEqual(new Set([0, 1, 2]));
    expect(Math.min(...fish.map(({ x }) => x))).toBeLessThan(-0.5);
    expect(Math.max(...fish.map(({ x }) => x))).toBeGreaterThan(0.5);
    expect(fish.every(({ y, z }) => Math.abs(y) < 0.8 && Math.abs(z) < 1.2)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run `npm test tests/artDirection.test.ts`.

Expected: FAIL because `src/config/artDirection.ts` and its exports do not exist yet.

- [ ] **Step 3: Implement the pure art-direction module**

Export typed palette constants, numeric lighting/material constants, explicit `DECORATION_CLUSTERS`, `getDecorationSpawnDescriptors()`, and `getInitialFishSpawn(index, total)`. Use no `Math.random`; compute fish positions from normalized index bands and cluster descriptors from literal data. Return fresh descriptor objects only during spawn/setup, never in a render loop. Decoration descriptors must include `type`, `x`, `z`, and typed props for seaweed/coral/rock. Fish descriptors must include `x`, `y`, `z`, `vx`, `vy`, `vz`, and `modelIndex`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run `npm test tests/artDirection.test.ts`.

Expected: 3 tests pass.

- [ ] **Step 5: Commit the pure contracts**

```bash
git add src/config/artDirection.ts tests/artDirection.test.ts
git commit -m "feat: define cohesive aquarium art direction"
```

### Task 2: Make default composition deterministic and clustered

**Files:**

- Modify: `src/systems/Spawner.tsx:1-165`
- Test: `tests/artDirection.test.ts`

- [ ] **Step 1: Add the integration-facing assertions**

Extend the art-direction tests to assert descriptor type counts (`seaweed`, `coral`, `rock`) and that cluster descriptors never occupy the central swim lane. Keep the assertions against the pure helper rather than mounting Rapier.

- [ ] **Step 2: Run the test and verify the new assertions fail if counts/layout drift**

Run `npm test tests/artDirection.test.ts` and confirm the expected count/layout failure before changing the integration.

- [ ] **Step 3: Replace default random decoration scatter with the helper**

In `Spawner`, import `getDecorationSpawnDescriptors` and use its descriptors for the initial decorations. Convert each descriptor to the existing ECS shape with `new Vector3(descriptor.x, -TANK_DIMENSIONS.height / 2, descriptor.z)` and `decorationProps: descriptor.props`. Do not store Rapier objects or render-only objects in ECS.

- [ ] **Step 4: Replace default fish opening with deterministic descriptors**

For the initial `initialFishCount`, use `getInitialFishSpawn(i, initialFishCount)` for position, velocity, and model index. Keep `__vibe_addFish` random and preserve its cap/status behavior. This changes only the initial presentation and leaves the boids/physics systems unchanged.

- [ ] **Step 5: Run focused tests and the full Spawner-adjacent suite**

Run `npm test tests/artDirection.test.ts tests/SimulationScene.test.tsx tests/FishRenderSystem.test.ts`.

Expected: all selected tests pass with no physics API changes.

- [ ] **Step 6: Commit composition changes**

```bash
git add src/systems/Spawner.tsx tests/artDirection.test.ts
git commit -m "feat: compose deterministic aquarium clusters"
```

### Task 3: Establish the shared low-poly decoration family

**Files:**

- Modify: `src/components/Decoration.tsx`
- Modify: `src/config/artDirection.ts`
- Test: `tests/artDirection.test.ts`

- [ ] **Step 1: Add material-language assertions**

Assert that the art-direction module exports `decorationRoughness >= 0.75`, `decorationMetalness === 0`, `seaweed`, `rock`, and `coral` colors, and that all colors are in the same named palette object. These assertions protect the intentional matte/faceted family rather than individual JSX implementation details.

- [ ] **Step 2: Run the focused test and confirm the new exports fail**

Run `npm test tests/artDirection.test.ts`; expect the missing material export failure.

- [ ] **Step 3: Refactor `Decoration.tsx` to shared materials and geometry language**

Use module-level immutable geometry/material configuration and `useMemo` only for prop-dependent geometry where necessary. Keep the existing component boundaries and fixed Rapier body. Replace bright rainbow coral and box blades with:

- a faceted `IcosahedronGeometry`/`DodecahedronGeometry` rock with flattened scale;
- a tapered, slightly curved seaweed blade family using slim low-segment boxes or capsules with shared kelp tone;
- a coral cluster built from low-segment tapered cylinders with one coral accent and a darker base tone.

Use `AQUARIUM_PALETTE` and `DECORATION_MATERIAL` for roughness/metalness/flat shading. Prop variation is bounded and seeded by the descriptor; no random calls occur during render. Preserve all three `DecorationType` values and the existing collider footprint.

- [ ] **Step 4: Run focused tests and a render-component test subset**

Run `npm test tests/artDirection.test.ts tests/FishRenderSystem.test.ts tests/SimulationScene.test.tsx`.

- [ ] **Step 5: Commit the decoration family**

```bash
git add src/components/Decoration.tsx src/config/artDirection.ts tests/artDirection.test.ts
git commit -m "feat: unify aquarium decoration materials"
```

### Task 4: Rebalance room, tank, water, and lighting hierarchy

**Files:**

- Modify: `src/components/LivingRoom.tsx`
- Modify: `src/components/Tank.tsx`
- Modify: `src/components/Water.tsx`
- Modify: `src/components/materials/WaterNodeMaterial.tsx`
- Modify: `src/components/materials/TankCausticsNodeMaterial.tsx`
- Modify: `src/SimulationScene.tsx`
- Modify: `src/config/artDirection.ts`
- Test: `tests/artDirection.test.ts`

- [ ] **Step 1: Add quality-invariant visual assertions**

Assert that art-direction constants provide the same water/room/glass palette independently of `QualityLevel`, that low quality only disables optional effects through the existing profile, and that the focal light intensity is greater than the room fill intensity. Keep these tests pure and do not import WebGPU modules into them.

- [ ] **Step 2: Run the test and verify the constants are absent or incorrect**

Run `npm test tests/artDirection.test.ts` and confirm the new contracts fail before implementation.

- [ ] **Step 3: Rework `LivingRoom` around warm, quiet framing values**

Use a warm charcoal stand with a simple inset/front face, muted plaster back wall, and warm floor. Keep the room surfaces broad and rough, reduce the side prop’s visual competition, and use the shared palette rather than literal unrelated grays. Retain shadow reception/casting where it contributes to the tank silhouette.

- [ ] **Step 4: Tune `SimulationScene` lights and renderer defaults**

Set the canvas background to a deep desaturated teal-black. Use one warm key from above/front, a low-intensity neutral hemisphere, and a restrained cool tank fill. Set exposure to the art-direction value and reduce environment-map intensity through the existing drei environment component or its supported prop. Keep shadow-map sizes and adaptive manager wiring unchanged.

- [ ] **Step 5: Tune tank glass/floor and caustics**

Use the shared glass tint, lower standard-glass opacity, and reduce WebGPU transmission/thickness/dispersion so edges frame fish instead of washing the volume. Set the tank floor to a dark warm stone tone. Lower caustics intensity and use the shared cool highlight color in both shader and TSL paths.

- [ ] **Step 6: Tune water in both renderer branches**

Use the deep teal volume and slightly lighter surface colors from `AQUARIUM_PALETTE`. Preserve quality-gated upgrades, but lower enabled caustic/specular/shimmer strengths to keep silhouettes dominant. Mirror every numeric/color change in `WaterNodeMaterial.tsx` and `TankCausticsNodeMaterial.tsx`; do not introduce WebGPU `onBeforeCompile` or postprocessing dependencies.

- [ ] **Step 7: Run focused material/quality tests**

Run `npm test tests/TankMaterial.test.ts tests/TankMaterial.test.tsx tests/TankCausticsOverlay.test.tsx tests/Water.test.tsx tests/VisualQualityContext.test.tsx tests/artDirection.test.ts`.

Expected: all selected tests pass on both mocked material paths.

- [ ] **Step 8: Commit the visual hierarchy**

```bash
git add src/config/artDirection.ts src/components/LivingRoom.tsx src/components/Tank.tsx src/components/Water.tsx src/components/materials/WaterNodeMaterial.tsx src/components/materials/TankCausticsNodeMaterial.tsx src/SimulationScene.tsx tests/artDirection.test.ts
git commit -m "feat: rebalance aquarium lighting and water palette"
```

### Task 5: Add runtime visual evidence and update project records

**Files:**

- Modify: `tests/e2e/smoke.spec.ts`
- Modify: `memory/designs/_index.md`
- Modify: `memory/tasks/_index.md`
- Modify: `memory/activeContext.md`
- Modify: `memory/progress.md`

- [ ] **Step 1: Add deterministic visual diagnostics to smoke coverage**

Extend `expectHealthyAquarium` or add a dedicated test that visits the default production preview, waits for the stable WebGL status and fish asset status, captures `test-results/issue-146-desktop.png`, and captures a 390×844 screenshot at `test-results/issue-146-mobile.png`. Assert no page errors, failed responses, missing canvas, or renderer fallback beyond the existing explicit WebGPU fallback test. Do not assert GPU pixels or exact canvas colors in CI; screenshot files are human-review artifacts.

- [ ] **Step 2: Run the production-preview smoke test**

Run `npm run build`, start the existing preview server as documented by `playwright.config.ts`, then run `npm run test:smoke`. Expected: all smoke tests pass and the two Issue 146 screenshots are created.

- [ ] **Step 3: Inspect screenshots and iterate only on confirmed visual defects**

Use the screenshot viewer on both artifacts. Confirm the tank is the brightest focal plane, fish silhouettes separate against the water, the center swim lane is open, decor reads as one family, and narrow viewport framing remains legible. If a defect is found, add a small focused change and rerun the relevant tests/smoke; do not compensate with saturation or large emissive boosts.

- [ ] **Step 4: Update memory records**

Add `DES016` to `memory/designs/_index.md` and a completed `TASK018` entry to `memory/tasks/_index.md`. Record the final palette, deterministic layout, renderer parity, validation commands, and any deferred visual polish in `memory/activeContext.md` and `memory/progress.md`.

- [ ] **Step 5: Commit evidence and records**

```bash
git add tests/e2e/smoke.spec.ts memory/designs/_index.md memory/tasks/_index.md memory/activeContext.md memory/progress.md
git commit -m "test: document cohesive aquarium visual evidence"
```

### Task 6: Full validation and pull-request handoff

- [ ] **Step 1: Run formatting and static validation**

Run `npm run format`, `npm run format:check`, `npm run lint -- --max-warnings=0`, `npm run typecheck`, and `git diff --check`. Resolve all failures before continuing.

- [ ] **Step 2: Run the full automated suite**

Run `npm test`, `npm run build`, and `npm run check:bundle`. Record exact pass counts and any expected bundle warnings in the PR.

- [ ] **Step 3: Run browser validation**

Run `npm run test:smoke` against the production preview and inspect the desktop/mobile screenshots plus browser console diagnostics.

- [ ] **Step 4: Review the final diff and branch state**

Run `git status --short --branch`, `git diff origin/main...HEAD --stat`, `git log --oneline origin/main..HEAD`, and inspect all changed visual files for accidental allocations in render loops, direct physics mutations, external asset URLs, or quality-gate regressions.

- [ ] **Step 5: Push the branch and open the PR**

```bash
git push -u origin codex/issue-146-cohesive-visuals
gh pr create --base main --head codex/issue-146-cohesive-visuals --title "feat: establish cohesive aquarium art direction" --body-file /tmp/issue-146-pr.md
```

The PR body must include: Issue 146 linkage, the visual thesis, changed components, the design/plan links, validation commands/results, screenshot artifact paths, WebGL/WebGPU notes, and deferred follow-ups. Do not merge; leave the PR open for review.
