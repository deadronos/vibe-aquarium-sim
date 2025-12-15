# [TASK005] - Implement Interactive Feeding & Food Entities

**Status:** Completed  
**Added:** 2025-12-15  
**Updated:** 2025-12-15

## Original Request

Add interactive feeding: allow the user to click/tap the tank to spawn food entities which fall under physics and can be consumed by fish.

## Thought Process

Feeding should be simple and responsive; the minimum enjoyable interaction is spawning a physical food object that fish can seek and eat. Keep logic within existing ECS + physics patterns:

- Spawn food via `world.add({ isFood: true, position, velocity })`.
- `Food` component owns a `RigidBody` + `BallCollider` and applies an initial velocity on mount via `setLinvel`.
- `BoidsSystem` queries `isFood` entities and seeks/consumes food when in range.

This keeps the interaction low-cost and reusable.

## Implementation Plan

1. Add `FeedingController` interactive plane (`src/components/FeedingController.tsx`) that listens for clicks and adds `isFood` entities at the clicked world position.
2. Add `Food` component (`src/components/Food.tsx`) that:
   - Creates a `RigidBody` and `BallCollider`.
   - Applies the initial `entity.velocity` using `rigidBody.setLinvel(...)` in `useEffect` (one-time application).
   - Syncs physics back to `entity.position` in `useFrame`.
3. Update `BoidsSystem` to:
   - Query `world.with('isFood', 'position')`, find nearest food within range, steer towards it, and remove the food (`world.remove(food)`) when `minFoodDist < 0.2`.
4. Add small UI prompt in `Tank.tsx` to instruct the user to click to feed fish.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description                                   | Status    | Updated    | Notes                                  |
| --- | --------------------------------------------- | --------- | ---------- | -------------------------------------- |
| 1.1 | Add `FeedingController`                       | Completed | 2025-12-15 | `src/components/FeedingController.tsx` |
| 1.2 | Create `Food` component with initial velocity | Completed | 2025-12-15 | `src/components/Food.tsx`              |
| 1.3 | Integrate with `BoidsSystem` seek/eat logic   | Completed | 2025-12-15 | `src/systems/BoidsSystem.tsx`          |
| 1.4 | Add UI prompt to `Tank.tsx`                   | Completed | 2025-12-15 | Visual hint: "Click tank to feed fish" |

## Acceptance Criteria

- Clicking the tank spawns a food entity at the click position. (Manual QA)
- Food falls under physics with initial velocity and collides with tank floor. (Manual QA)
- Fish seek and remove food when close enough. (Manual QA and integration tests planned)
- No memory leaks (food removed when eaten) and acceptable perf.

## Notes & Next Steps

- Consider adding automated integration tests for feeding behavior (e.g., spawn food programmatically and assert fish consume it).
- Potential enhancements: different food types, scored feeding, or attractor-based feeding effects.

## References

- `src/components/FeedingController.tsx`
- `src/components/Food.tsx`
- `src/systems/BoidsSystem.tsx`
