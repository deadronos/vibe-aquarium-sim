# TASK009 - Fix InstancedMesh matrix update bug (single fish rendered)

**Status:** Completed 2026-01-14  
**Added:** 2026-01-14  
**Updated:** 2026-01-14

## Original Request

User reported that only a single fish was visible when many fish were spawned.

## Summary

- Root cause: When the Adaptive Instance Updates PoC was disabled, the baseline code path mistakenly did not write per-instance matrices into the three `InstancedMesh` objects — it only relied on the chunked dirty-flush path used by the PoC. As a result, most instance matrices stayed at the identity matrix and rendered on top of each other (appearing as one fish).
- Fix: In `src/systems/FishRenderSystem.tsx` we now:
  - Detect whether the PoC (adaptive instance updates) is enabled.
  - If disabled (baseline), write each instance's matrix directly inside the main loop and set the instanceMatrix.needsUpdate flag only when instances were written this frame.
  - If enabled, continue using the existing chunked dirty-flush strategy (marking matrices as dirty and flushing a budgeted number of writes per frame).
- Files changed: `src/systems/FishRenderSystem.tsx`

## Implementation Plan

- [x] Reproduce issue locally by spawning many fish and verifying overlap.
- [x] Add module-level flags to detect PoC enabled/disabled at runtime.
- [x] Write matrices directly in the baseline path and only use dirty/chunked flush when PoC is enabled.
- [x] Avoid allocations in hot paths: reuse preallocated Matrix4 pools and `Object3D` helpers.
- [x] Add debug sampling via Debug HUD to verify counts and active entities.

## Verification

- Visual check: Spawned 60 fish and confirmed each fish appears in distinct positions (not overlapping). Screenshot attached to the issue (manual verification).
- Debug HUD: `__vibe_renderStatus.activeEntities` and `__vibe_debug.fishRender` showed expected counts.
- Smoke test: toggling the Debug HUD's "Adaptive Instance Updates" checkbox still enables chunked flush behavior and preserves correctness.

## Follow-ups

- Add a unit/integration test that exercises both code paths (PoC enabled and disabled), verifying that multiple instances have non-identity matrices after a canonical update cycle.
- Consider adding a small stress-test script to CI that spawns N fish and asserts unique transforms (fast smoke test; non-flaky thresholding required).

**Reference:** DES006 (Fish Instancing), DES007 (Rotation interpolation)
