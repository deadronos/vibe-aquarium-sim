# [TASK019] - Rebuild the app as a living-room aquarium

**Status:** Completed (2026-10-22)
**Added:** 2026-10-22
**Updated:** 2026-10-22

## Original request

Rebuild the app from scratch on a new branch so the fish tank sits in a believable living room,
reusing the existing fish GLBs.

## Implementation

- New `src/` with the sim/scene/ui split described in DES017.
- New unit tests (`tests/*.test.ts`) and Playwright smoke test; CI updated.
- README, AGENTS.md and `docs/agents/*` rewritten.

## Validation

- Format, lint, typecheck, 22 unit tests, build, bundle budget and smoke test green in CI.
- Manual browser checks at day, evening and night across all viewpoints; 60 FPS on High in the
  development browser.

## Follow-ups

- The CI smoke test needed the Vulkan SwiftShader flags restored and `?quality=lite`.
- The Pages boot check still grepped the old test title (fixed in PR #168, TASK020).
