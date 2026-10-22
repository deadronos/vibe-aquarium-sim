# [TASK006] - Document & Finalize Physics Force-Queue Refactor

**Status:** Completed  
**Added:** 2025-12-09  
**Updated:** 2025-12-15

**Related Design:** [DES004] Physics: Force-Queue Pattern & Safe Rapier Integration

## Original Request

Refactor physics systems (drag, currents, steering) so that forces are computed in systems but applied safely by components that own `RigidBody` instances. Add helper utilities for drag/current computation and queued-force application.

## Thought Process

This work centralizes a safe integration pattern (queue forces in systems, apply in components) and introduces reusable utilities and unit tests to prevent regressions and avoid Rapier WASM re-entrancy issues.

## Implementation Plan & Progress

- Implemented `applyQueuedForcesToRigidBody`, `computeDragForce`, and `computeWaterCurrent` in `src/utils/physicsHelpers.ts`.
- Implemented `WaterResistanceSystem` and `WaterCurrentSystem` which compute and queue forces on entities.
- Ensured components (e.g., `Fish`) apply queued forces safely (via `setLinvel` or by calling utilities when safe).
- Added unit tests in `tests/physicsHelpers.test.ts`, `tests/WaterResistanceSystem.test.ts`, and `tests/WaterCurrentSystem.test.ts`.

**Overall Status:** Completed - 100%

## Acceptance Criteria

- No system directly calls Rapier APIs. (Verified by code scan)
- Utilities are unit-tested and validate safe application of queued forces. (Tests added and passing)
- Fish motion is stable and free of Rapier re-entrancy errors. (Manual QA + tests)

## Next Steps

- Add a short lint/code-review checklist item to flag direct Rapier usage in systems.
- Consider adding an integration test simulating a short run with multiple fish + currents to assert stability under load.

## References

- DES004: `memory/designs/DES004-physics-force-queue.md`
- `src/utils/physicsHelpers.ts`
- `src/systems/WaterResistanceSystem.tsx`
- `src/systems/WaterCurrentSystem.tsx`
- `src/components/Fish.tsx`
- `tests/physicsHelpers.test.ts`
