# [DES005] - Interactive Feeding & Food Entities

**Status:** Completed  
**Added:** 2025-12-15  
**Updated:** 2025-12-15

## Problem Statement

We want an interactive way to feed fish in the aquarium that:

- Allows users to drop food into the tank by clicking.
- Produces physical food objects that fall and can be eaten by fish.
- Drives natural-seeming fish behavior (seek and consume food when nearby).

## Solution Overview

- **FeedingController**: An invisible clickable plane that captures clicks and spawns a `Food` entity at the click world position.
- **Food Component**: A `RigidBody` with a small mass and `BallCollider`, with an initial downward velocity applied once on spawn. It is rendered as an orange sphere.
- **Boids Integration**: `BoidsSystem` queries entities with `isFood` and, when food is within range, fish either seek it or remove it (simulate eating) when very close.

This design keeps the interaction simple and within existing ECS + physics patterns.

## Architecture & Files

- `src/components/FeedingController.tsx` — captures clicks and spawns food via `world.add({ isFood: true, position, velocity })`.
- `src/components/Food.tsx` — RigidBody with explicit `BallCollider` and an initial `setLinvel(entity.velocity)` applied in `useEffect`.
- `src/systems/BoidsSystem.tsx` — Searches for `isFood` entities and applies seek behavior or consumes the food when close.
- Visual/UI: `Tank.tsx` includes a small helper text prompting the user to click to feed fish.

## Acceptance Criteria

- Clicking inside the tank spawns a food entity at the clicked world position. [Manual QA]
- Food has a small downward initial velocity and reacts to physics (collisions with floor/walls). [Manual QA + unit tests if applicable]
- Fish detect nearby food, steer towards it, and remove the food entity when within <0.2m (eaten). [Integration QA]
- No memory leaks (food is removed from world when eaten) and performance remains acceptable.

## Tests & Notes

- `src/components/Food.tsx` applies initial velocity in `useEffect` to avoid applying impulses during forbidden phases.
- Boids `seek` to nearest food within a 5.0 unit range, then if closer than 0.2 units, `world.remove(food)` is called to simulate eating.

## Next Steps & Enhancements

- Add an optional `FeedingSystem` if feeding responsibilities grow (e.g., food aggregation, decay, or nutrient effects).
- Add unit/integration tests to validate the feeding lifecycle automatically.
- Add visual feedback when fish are attracted to food (e.g., slight highlight or trail).

## References

- `src/components/FeedingController.tsx`
- `src/components/Food.tsx`
- `src/systems/BoidsSystem.tsx`

---
