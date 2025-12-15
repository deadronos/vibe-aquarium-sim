# [TASK004] - Fix fish motion after decoupling physics/rendering

**Status:** Completed  
**Added:** 2025-12-09  
**Updated:** 2025-12-15

## Original Request

"we decoupled physics / rendering but fish are not moving at all now, investigate and fix"

## Thought Process

- Fish visuals were separated from the physics body; the `RigidBody` now has no child geometry, so auto-generated colliders are missing and the body has zero mass, preventing impulses from moving it.
- Forces (boids steering, water currents, drag) are still queued correctly, so restoring a collider should reintroduce mass and motion.

## Requirements (EARS)

- WHEN a fish entity is created, THE SYSTEM SHALL attach a dynamic rigid body with a collider approximating the fish size so queued forces result in motion. [Acceptance: body has non-zero mass and moves when an impulse is applied]
- WHEN steering or external forces are queued, THE SYSTEM SHALL apply them each physics step to change the rigid body velocity. [Acceptance: impulses update `linvel` and visual interpolation follows]
- WHEN no render mesh is nested under the `RigidBody`, THE SYSTEM SHALL still define the collider shape explicitly. [Acceptance: collider exists and simulation runs without silent mass=0 bodies]

## Implementation Plan

- Inspect `Fish` rigid body setup to confirm collider generation broke after decoupling visuals from physics.
- Add an explicit `BallCollider` sized to the ~12cm fish (~0.06m radius) and disable auto collider inference.
- Keep physics/render sync hooks (`useBeforePhysicsStep`/`useAfterPhysicsStep`) unchanged; verify forces still apply.
- Sanity check mass and motion (manual run or reasoning); add follow-up tests if needed.

## Progress Tracking

**Overall Status:** In Progress - 90%

### Subtasks

| ID  | Description                                               | Status    | Updated    | Notes                                                    |
| --- | --------------------------------------------------------- | --------- | ---------- | -------------------------------------------------------- |
| 1.1 | Confirm missing collider after decoupling visuals/physics | Completed | 2025-12-09 | Symptoms match zero-collider bodies                      |
| 1.2 | Add explicit collider to fish rigid body                  | Completed | 2025-12-09 | Added BallCollider radius 0.06m                          |
| 1.3 | Validate motion resumes and no regressions observed       | Completed | 2025-12-15 | Verified via `src/components/Fish.test.ts` and manual QA |
| 1.4 | Fix Rapier unreachable panic with step hooks              | Completed | 2025-12-09 | Removed step hooks, moved to useFrame                    |

## Progress Log

### 2025-12-09

- Investigated motion loss; identified that auto collider inference no longer works because the `RigidBody` has no child mesh. Plan to add explicit ball collider sized to fish (~0.06m radius).
- Implemented explicit `BallCollider` on fish `RigidBody` (radius 0.06m) and disabled auto collider inference; ready to validate motion/responsiveness.
- Encountered Rapier "recursive use" and "unreachable" panics when using `useBeforePhysicsStep`/`useAfterPhysicsStep` hooks.
- Attempted moving to `useFrame` with `applyImpulse` but still hit re-entrancy errors during physics step.
- **Final solution**: Replaced impulse-based force application with direct velocity manipulation using `setLinvel`. Systems calculate force→velocity changes and store in `targetVelocity`, then Fish component applies this velocity directly, avoiding Rapier's impulse system that was triggering re-entrancy panics.
