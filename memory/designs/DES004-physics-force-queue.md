# [DES004] - Physics: Force-Queue Pattern & Safe Rapier Integration

**Status:** Completed  
**Added:** 2025-12-09  
**Updated:** 2025-12-15

## Problem Statement

Rapier (Rust/WASM) calls made from arbitrary systems during the physics step can cause WASM re-entrancy errors, panics, and nondeterministic behavior when systems attempt to call Rapier APIs (e.g., applyImpulse) while the engine is mid-step. Systems often compute forces or impulses based on world state, but calling Rapier directly from these systems is unsafe.

## Design Summary

Adopt a canonical "Queue-and-Apply" pattern:

- Systems (Boids, WaterResistance, WaterCurrent, etc.) compute forces/steering but **must not** call Rapier directly.
- Systems write computed vectors to ECS fields such as `steeringForce` or `externalForce` (Vector3 instances on the entity).
- The component that owns the `RigidBody` (for example `Fish` or `Food`) applies queued forces at a safe point in the render loop (e.g., inside `useFrame` after the physics step), either by:
  - Converting forces to a `targetVelocity` and using `RigidBody.setLinvel(...)` for deterministic velocity control; or
  - Using a small utility to convert forces to impulses and call `RigidBody.applyImpulse(...)` when not inside the physics step.

This pattern prevents unsafe Rapier calls during the physics step and centralizes Rapier usage in components that own bodies.

## Key Implementation Notes

- Utilities: `src/utils/physicsHelpers.ts` provides:
  - `applyQueuedForcesToRigidBody(rigidBody, entity, delta)` — applies queued steering/externalForce as impulses scaled by `delta`.
  - `computeDragForce(velocity, out)` — quadratic drag implementation used by `WaterResistanceSystem`.
  - `computeWaterCurrent(position, time, out)` — procedural current vector used by `WaterCurrentSystem`.
- Systems queue forces:
  - `src/systems/WaterResistanceSystem.tsx` sets `entity.externalForce`.
  - `src/systems/WaterCurrentSystem.tsx` adds current vectors to `entity.externalForce`.
- Application point:
  - `src/components/Fish.tsx` demonstrates a safe application strategy: read current `RigidBody` state, incorporate `steeringForce` and `externalForce` into a `targetVelocity`, then call `rigidBody.setLinvel(targetVelocity, true)`. This avoids re-entrancy panics and resolves the overwrite/collision ordering issue.
- Tests:
  - `tests/physicsHelpers.test.ts` verifies `applyQueuedForcesToRigidBody` and the pattern safety (computation while inside physics step, application once safe).

## Acceptance Criteria

- Systems compute forces and set ECS vectors without calling Rapier directly. (Verified by code inspection and unit tests.)
- Utilities exist for drag/current computation and applying queued forces (present at `src/utils/physicsHelpers.ts`).
- Fish movement is stable and does not trigger Rapier re-entrancy panics. (Verified by `Fish` integration tests and manual QA.)
- No system-level Rapier calls remain in system code.

## Rationale

- Centralizing Rapier calls avoids unsafe cross-boundary interactions with the WASM engine.
- Queuing forces maintains separation of concerns: systems compute behavior, components own physics responsibilities.
- Tests exercise the pattern so future refactors remain safe.

## Migration & Follow-up

- Audit systems to ensure all external Rapier calls are removed (if any remain, move them to components or utilities).
- Consider a small lint rule / code review checklist to flag direct Rapier usage in systems.
- If future performance profiling shows hotspots, consider applying impulses in batched steps within a controlled post-physics phase.

## References

- `src/utils/physicsHelpers.ts` (applyQueuedForcesToRigidBody, computeDragForce, computeWaterCurrent)
- `src/systems/WaterResistanceSystem.tsx`
- `src/systems/WaterCurrentSystem.tsx`
- `src/components/Fish.tsx`
- `tests/physicsHelpers.test.ts`

---
