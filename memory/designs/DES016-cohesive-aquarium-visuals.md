# DES016 - Cohesive Aquarium Art Direction

**Status:** Completed (2026-09-04)

## Summary

Issue 146 establishes a shared visual language for the aquarium: deep blue-green water, warm subdued room framing, matte low-poly decorations, restrained optical effects, and fish-first contrast. The implementation keeps palette and composition renderer-independent while preserving the existing WebGL/WebGPU material split and quality gates.

## Decisions

- Palette values live in `src/config/artDirection.ts` and are consumed by room, tank, water, caustics, and decoration components.
- The default opening uses deterministic fish placement/model cycling and two side reef clusters, leaving a clear central swim lane.
- Decor uses shared rough, non-metal, flat-shaded materials with bounded stylized-natural geometry. No external models or runtime network assets were added.
- A dark inner tank backplate carries the water value consistently against the room wall; water volume opacity is increased modestly while glass and caustics are reduced.
- The cool tank key/fill and warm room light are intentionally hierarchical: fish and water read first, room/stand support the composition.
- Low quality keeps the same palette, backplate, decor, and fish layout while disabling optional effects through the existing quality profile.

## Key values

- Water volume: `#123b43`, opacity `0.38`
- Water surface: `#1d5960`
- Water highlight/caustics: `#8fc8c0`, caustics intensity `0.42`
- Kelp: `#315d4d`
- Rock: `#5f6258` / `#8f8b78`
- Coral: `#c87862` / `#744b4a`
- Room wall: `#343c38`
- Stand: `#252b2a` with `#111917` inset
- Decoration roughness: `0.86`, metalness `0`, flat shading enabled

## Files

- `src/config/artDirection.ts` — palette, lighting/material values, and deterministic descriptors
- `src/components/LivingRoom.tsx` — warm room/stand framing
- `src/components/Decoration.tsx` — shared low-poly decoration family
- `src/components/Tank.tsx` — backplate, glass, floor, and caustics balance
- `src/components/Water.tsx` and `src/components/materials/WaterNodeMaterial.tsx` — matched water branches
- `src/SimulationScene.tsx` and `src/components/EnvironmentMap.tsx` — lighting/exposure/environment hierarchy
- `tests/artDirection.test.ts`, `tests/SimulationScene.test.tsx`, `tests/Water.test.tsx` — contracts and integration coverage
- `tests/e2e/smoke.spec.ts` — repeatable desktop/phone screenshot artifacts

## Validation evidence

- Origin baseline screenshot: `output/playwright/issue-146-before-origin-main.png`
- After screenshots: `output/playwright/issue-146-after-desktop.png`, `output/playwright/issue-146-after-mobile.png`
- Focused material/composition suite: 22 tests passed during implementation
- Production build and bundle budget passed
- Existing seven browser smoke tests passed; dedicated visual artifact smoke passed

## Follow-ups

- Keep screenshot review human-driven rather than asserting exact GPU pixels in CI.
- Consider a future authored asset family only if it can preserve the current loading and quality budgets.
