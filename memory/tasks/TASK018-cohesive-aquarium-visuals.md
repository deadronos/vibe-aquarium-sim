# [TASK018] - Establish cohesive aquarium visuals

**Status:** Completed (2026-09-04)
**Added:** 2026-09-04
**Updated:** 2026-09-04

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
