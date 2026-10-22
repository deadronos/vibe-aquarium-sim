# [TASK018] - Establish cohesive aquarium visuals

**Status:** Completed (2026-09-04)
**Added:** 2026-09-04
**Updated:** 2026-09-07

## Original request

Implement Issue 146, “Establish a cohesive aquarium art direction and lighting pass,” using reasonable 3D-art assumptions and open a pull request when validated.

## Acceptance criteria

- Deep blue-green tank focal point with warm subdued room framing.
- Shared palette, scale language, roughness, and material response across decorations.
- Matching WebGL/WebGPU art direction with existing backend-specific material paths.
- Readable fish silhouettes and coherent side-cluster composition across quality levels.
- Deterministic setup with before/after screenshot evidence.

## Implementation

- Added centralized art direction constants and pure deterministic fish/decor descriptors.
- Replaced default random decoration scatter with two side reef clusters and preserved a center swim lane.
- Rebalanced room, stand, tank backplate, glass, water, caustics, environment, and lights.
- Rebuilt coral/seaweed/rock forms as a shared matte faceted family without external assets.
- Added renderer-neutral visual artifact smoke coverage for desktop and phone viewports.

## Validation

- `npm test` baseline: 196 passed, 1 skipped on `origin/main`.
- Focused implementation suites: green.
- `npm run typecheck`: green.
- `npm run build`: green.
- `npm run check:bundle`: green.
- `npm run test:smoke`: 7 passed after the visual changes; dedicated screenshot smoke passed separately.
- Playwright CLI screenshots inspected for origin baseline and after state; no page errors observed.

## PR 159 review corrections (2026-09-07)

- Moved rear caustics onto the visible side of the opaque backplate.
- Replaced the repeating stress spawn grid with separated deterministic 3D positions.
- Added responsive camera fitting around the phone rail, preserving user orbit zoom/pan across resize.
- Corrected WebGPU optical glass thickness to match the modeled wall and reduced transmission roughness.
- Added real WebGL/WebGPU × four-quality screenshot coverage with asset/render readiness and no-fallback assertions; explicit quality queries now lock the preset.
- Unified browser checks on full Chromium and retained CI traces/HTML reports. Historical mobile timeouts did not reproduce as functional failures; local shell/runtime timing evidence is documented.
- Validation: 223 passed, 1 skipped; 15/15 browser tests passed; format/lint/typechecks/build/bundle budgets passed.
- Review details and committed representative screenshots: `docs/reviews/issue-146-visual-verification.md`.
