# TASK011 - Fix Food Spawning Reachability

**Status**: Completed
**Date**: 2025-12-17

## Description

The user reported an issue where food pellets could spawn outside the fish's reach (e.g., on the tank walls), causing fish to ignore them or fail to reach them due to boundary forces. The goal was to ensure food always spawns within the `SIMULATION_BOUNDS` accessible to fish.

## Context

- **Problem**: The `FeedingController` used the exact world coordinates of the click event on the tank mesh (glass). Since the tank has thickness and bounds, clicking the edge spawned food at coordinates that might be outside the soft boundary used by `BoidsSystem` to keep fish inside.
- **Solution**: Clamp the spawn coordinates (x and z) to the `SIMULATION_BOUNDS` defined in `constants.ts`.

## Implementation Details

- **File**: `src/components/FeedingController.tsx`
- **Change**: Added clamping logic to `handleClick`:

```typescript
const x = Math.max(-SIMULATION_BOUNDS.x, Math.min(SIMULATION_BOUNDS.x, point.x));
const z = Math.max(-SIMULATION_BOUNDS.z, Math.min(SIMULATION_BOUNDS.z, point.z));
world.add({ isFood: true, position: new Vector3(x, point.y, z), ... });
```

## Verification

- **Manual Test**: Verified by clicking on the extreme edges of the tank (front/side glass). Food now spawns slightly inset, within the `SIMULATION_BOUNDS`.
- **Fish Behavior**: Fish can now reach and consume all spawned food pellets.

## Dependencies

- `SIMULATION_BOUNDS` from `src/config/constants.ts`
