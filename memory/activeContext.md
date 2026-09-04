# Active Context

## Current focus

- Branch: `codex/issue-141-refresh-rate`
- Issue #141 refresh-rate evidence and the fixed-step ownership correction are implemented on top of merged Phase 7 PR #157; deterministic 30/60/120 Hz trajectory coverage is fully validated and ready for PR publication.

## Recent changes

- Implemented **Marine Snow** particle system:
  - Replaced `AmbientParticles` with a directional drift + wrap-around shader.
  - Used `mod()` logic in vertex shader for infinite snow volume without CPU overhead.
  - Tuned visuals for subtle white specks to enhance depth perception.
- Implemented hybrid water simulation (visual shader, drag/resistance system, procedural currents).
- Implemented fixed-step scheduler and moved Boids logic into the scheduler.
- Added physics-safe force-queue utilities and reworked components (Fish/Food) to apply queued forces safely.
- Added interactive feeding via `FeedingController` and `Food` entities.
- Fixed food spawning reachability by clamping spawn position to simulation bounds.
- Offloaded boids, food seeking, and water forces to `multithreading` workers; main thread now applies returned forces.
- Added a `SharedArrayBuffer` path for the boids worker when cross-origin isolation is available, with automatic fallback to cloned worker messages on non-isolated hosts (2026-03-29).
- Added a transferable ping-pong `ArrayBuffer` path for non-isolated production pages; the host copies reusable snapshots into owned slots and never reads detached buffers (2026-09-03).
- Backfilled tank visual materials and caustics values into `DES015` and created `TASK013` (completed) and `TASK014` (pending) to add verification tests (2026-01-13).
- Fixed `npm run build` TypeScript errors introduced by debug/perf instrumentation and quality store state.
- Implemented code-splitting (manualChunks) and lazy-loaded the simulation so Rapier loads only after start; added simulation autostart + loading overlay and removed StrictMode to avoid dev WebGL context loss (2026-01-14, TASK015).

## Next steps

1. Publish the reviewed Issue #141 PR.
2. Continue visual parity work in #140 and browser-backed ECS/Rapier coverage in #148.
3. Keep the umbrella issue #150 synchronized with the phase status and acceptance evidence.

## Active decisions / considerations

- **Particle Systems**: Use GPU-side wrapping (modulo arithmetic) for ambient/environmental particles to create infinite volumes without CPU allocation or complex buffer management.
- Physics is the authoritative source of truth for simulation state; systems must drive the physics, not directly mutate positions.
- Keep render-loop allocations to a minimum (module-level vector reuse). This is a strict performance constraint for `useFrame`-driven systems.
