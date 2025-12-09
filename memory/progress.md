# Progress

## What works

- Project scaffold and core components exist in `src/` (Fish, Tank, BoidsSystem, store)
- Basic unit test harness and linting configuration present (Vitest, ESLint, Prettier)

## What's left / next milestones

1. Finish systems for spawning, food, and more robust boid interactions.
2. Add tests for ECS ↔ Physics synchronization and edge-case collisions.
3. Add basic UI (Zustand) for runtime tweaking and debug overlays.

## Current status

- Phase: In Progress
- Branch: `rewrite-aquarium-sim` (work in-progress)

## Known issues / technical debt

- No persistent tasks or design docs were present in `memory/` before this update — memory bank must be maintained as work continues.
- Full fluid simulation is out of scope for current milestone and should be tracked separately as a design item.
