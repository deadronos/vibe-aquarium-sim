# Active Context

## Current focus

- Branch: `main` (features merged)
- Maintain and polish core systems, including the new worker-offloaded boids + water force pipeline.

## Recent changes

- Implemented hybrid water simulation (visual shader, drag/resistance system, procedural currents).
- Implemented fixed-step scheduler and moved Boids logic into the scheduler.
- Added physics-safe force-queue utilities and reworked components (Fish/Food) to apply queued forces safely.
- Added interactive feeding via `FeedingController` and `Food` entities.
- Fixed food spawning reachability by clamping spawn position to simulation bounds.
- Offloaded boids, food seeking, and water forces to `multithreading` workers; main thread now applies returned forces.

## Next steps

1. Add automated integration tests for feeding behavior and ECS↔Physics scenarios.
2. Performance tuning and profiling with larger fish counts (50–100).
3. Add a small runtime UI (Zustand) for tuning water/physics parameters and toggles.
4. Optional: implement a grid-based velocity field if needed for more complex flow patterns.

## Active decisions / considerations

- Physics is the authoritative source of truth for simulation state; systems must drive the physics, not directly mutate positions.
- Keep render-loop allocations to a minimum (module-level vector reuse). This is a strict performance constraint for `useFrame`-driven systems.
