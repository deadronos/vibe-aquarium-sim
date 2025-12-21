# Progress

## What works

- Project scaffold and core components exist in `src/` (Fish, Tank, BoidsSystem, store)
- Basic unit test harness and linting configuration present (Vitest, ESLint, Prettier)
- Boids + water drag/current calculations are offloaded to a multithreaded worker and applied back to ECS each fixed step.
- Documentation: `AGENTS.md` and `.github/copilot-instructions.md` updated to reference `.github/instructions/memory-bank.instructions.md` and `.github/instructions/spec-driven-workflow-v1.instructions.md` and recorded in memory (2025-12-09)

## What's left / next milestones

1. Add automated integration tests for feeding behavior and end-to-end ECS↔Physics scenarios.
2. Performance tuning under larger counts (50–100 fish) and profiling shader / system hotspots.
3. Add a small runtime UI for tuning water/physics parameters (Zustand planned).
4. Optional: implement a grid-based velocity field (trilinear sampling) if procedural currents are insufficient for future features.

## Current status

- Phase: Maintenance & polish (core features implemented: water visuals + resistance, currents, fixed-step scheduler, feeding, physics queue utilities)
- Branch: `main` (features merged)

## Known issues / technical debt

- No persistent tasks or design docs were present in `memory/` before this update — memory bank must be maintained as work continues.
- Full fluid simulation is out of scope for current milestone and should be tracked separately as a design item.

### 2025-12-15

- Backfilled memory bank: added DES004 (physics force-queue) and DES005 (feeding) and updated `memory/tasks` to reflect implemented work.
- TASK002 (Water), TASK003 (Fixed-step), and TASK004 (Fix fish motion) marked Completed; TASK005 and TASK006 added as Completed.
- Ran unit tests for `physicsHelpers`, `WaterResistanceSystem`, `WaterCurrentSystem`, `FixedStepScheduler`, and `Fish` — all passed.
- Next: add integration tests for feeding and run performance profiling as needed.

### 2025-12-17

- Fixed food spawning issue where pellets were unreachable on tank edges (TASK011). Clamped spawn coordinates to `SIMULATION_BOUNDS`.

### 2025-12-21

- Offloaded boids, food seeking, and water forces to a `multithreading` worker kernel; main thread now applies results and side effects (TASK012).
- App wiring updated to avoid double-applying water forces; format and lint run cleanly.
