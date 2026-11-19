# Contact Shadows and Fish Grounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this
> plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground furniture and fish with inexpensive procedural contact shadows.

**Architecture:** Generate one cached radial alpha texture, write fixed furniture instances once,
and update one fish-shadow instance buffer in the existing fish loop. Keep calculations in a
small allocation-free helper so sloped-floor placement and height fading are unit-testable.

**Tech Stack:** TypeScript, React Three Fiber, Three.js, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-issue-189-contact-shadows-design.md`

## Global Constraints

- Simulation remains plain TypeScript; no shadow logic enters `src/sim/`.
- World coordinates remain metres and underwater geometry uses `makeUnderwater`.
- Frame loops allocate no new objects, arrays, vectors, matrices, or closures.
- No new image assets or third-party dependencies.

## Review Focus

- Fish near the sand must not intersect or float above the sloped substrate.
- High fish must fade without disappearing abruptly at the water surface.
- Instanced shadows must not inherit fish-model transforms or stale matrices.
- Lite must avoid the static shadow batch while retaining one cheap fish-shadow batch.
- Transparent shadows must not write depth or cast their own shadows.

---

### Task 1: Define and test shadow layout

**Files:**

- Create: `tests/shadows.test.ts`
- Create: `src/scene/shadows.ts`

**Interfaces:**

- Produces:
  `writeShadowMatrix(matrix, x, y, z, width, depth, rotationY)`
  `writeFishShadowLayout(output, x, y, z, fishScale, growth)`
- `FishShadowLayout` exposes x, y, z, scaleX, scaleZ, and strength.

- [x] **Step 1: Write failing tests**

  Test that a shadow matrix lies on the requested floor plane with the requested horizontal
  extents and y rotation. Test that a fish near the substrate receives a larger, stronger shadow
  than the same fish near the water surface, with `y` matching `substrateHeight(x, z) + 0.003`.

- [x] **Step 2: Run the focused test**

  Run: `npm run test -- tests/shadows.test.ts`

  Expected: FAIL because `src/scene/shadows.ts` is missing.

- [x] **Step 3: Implement allocation-free layout helpers**

  Reuse module-level quaternion/scale scratch and mutate the caller-provided matrix/output.
  Clamp height fading to finite values and preserve the requested fish growth.

- [x] **Step 4: Verify the focused test**

  Run: `npm run test -- tests/shadows.test.ts`

  Expected: PASS.

### Task 2: Generate the procedural shadow texture

**Files:**

- Modify: `src/scene/textures.ts`
- Modify: `tests/shadows.test.ts`

**Interfaces:**

- Produces: `softShadowTexture(): THREE.Texture`

- [x] **Step 1: Add a failing texture contract test**

  Add a source-level contract test that requires a cached, non-repeating radial shadow texture
  without creating an external asset.

- [x] **Step 2: Run the focused test**

  Run: `npm run test -- tests/shadows.test.ts`

  Expected: FAIL because `softShadowTexture` is absent.

- [x] **Step 3: Implement the cached procedural texture**

  Generate a small grayscale radial canvas, disable repeat and sRGB conversion, and return it
  through the existing memoized texture cache.

- [x] **Step 4: Verify the focused test**

  Run: `npm run test -- tests/shadows.test.ts`

  Expected: PASS.

### Task 3: Render static furniture grounding

**Files:**

- Create: `src/scene/room/RoomContactShadows.tsx`
- Modify: `src/scene/Experience.tsx`

**Interfaces:**

- Consumes: `writeShadowMatrix` and `softShadowTexture`.
- Produces: one transparent, depth-write-disabled instanced contact-shadow mesh for
  Medium/High quality.

- [x] **Step 1: Implement the static instanced batch**

  Define the fixed cabinet, sofa, table, lamp, plant, and bookshelf footprints and write all
  matrices once in a layout effect.

- [x] **Step 2: Run typecheck and the unit suite**

  Run: `npm run typecheck && npm run test`

  Expected: PASS.

### Task 4: Render fish blob shadows

**Files:**

- Modify: `src/scene/fish/FishView.tsx`
- Modify: `tests/shadows.test.ts`

**Interfaces:**

- Consumes: `writeFishShadowLayout`, `softShadowTexture`, and the existing shared school arrays.
- Produces: one instanced underwater shadow mesh updated in the fish frame loop.

- [x] **Step 1: Add the fish shadow batch**

  Use preallocated module-level layout/vector/matrix scratch, set all matrices and instance colors
  in the existing species loop, and update the material opacity from tank light.

- [x] **Step 2: Add any missing edge-case assertion**

  If implementation exposes a clamping edge case, add the smallest test before adjusting it.

- [x] **Step 3: Verify typecheck and tests**

  Run: `npm run typecheck && npm run test`

  Expected: PASS.

### Task 5: Validate visual and performance behavior

**Files:**

- Modify: `docs/performance/rendering-baseline.md`
- Modify: `tests/e2e/smoke.spec.ts` only if an explicit visual assertion is stable.

- [x] **Step 1: Run formatting, lint, typecheck, and unit tests**

  Run:
  `npm run format && npm run lint -- --max-warnings=0 && npm run typecheck && npm run test`

  Expected: all commands exit 0.

- [x] **Step 2: Build and verify bundle limits**

  Run: `npm run build && npm run check:bundle`

  Expected: build succeeds and the bundle remains below the repository budgets.

- [x] **Step 3: Verify browser views**

  Run: `npm run test:smoke`

  Capture and inspect Sofa and Up close screenshots, confirming both static and fish grounding.

- [x] **Step 4: Verify Lite performance**

  Run: `npm run bench:render -- --quality=lite`

  Compare FPS/frame-time with the documented baseline and record the result.

- [ ] **Step 5: Review and hand off**

  Run a fresh code review, resolve all actionable findings, push the branch, and open a PR that
  closes #189.
