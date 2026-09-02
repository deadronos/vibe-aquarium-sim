# Active Context

## Current focus

- Branch: `codex/phase2-telemetry`
- Phase 2 issue #144 is implemented on top of merged Phase 1 PR #151; the telemetry gate and steady-state profile contract are ready for review.

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
- Backfilled tank visual materials and caustics values into `DES015` and created `TASK013` (completed) and `TASK014` (pending) to add verification tests (2026-01-13).
- Fixed `npm run build` TypeScript errors introduced by debug/perf instrumentation and quality store state.
- Implemented code-splitting (manualChunks) and lazy-loaded the simulation so Rapier loads only after start; added simulation autostart + loading overlay and removed StrictMode to avoid dev WebGL context loss (2026-01-14, TASK015).

## Next steps

1. Review Phase 2 #144 PR #152 now that Phase 1 PR #151 is merged.
2. Continue with adaptive quality (#143), zero-copy worker transport (#142), and asset transfer reduction (#145).
3. Revisit visual parity (#140) and refresh-rate evidence (#141) after the performance work has measurements.

## Active decisions / considerations

- **Particle Systems**: Use GPU-side wrapping (modulo arithmetic) for ambient/environmental particles to create infinite volumes without CPU allocation or complex buffer management.
- Physics is the authoritative source of truth for simulation state; systems must drive the physics, not directly mutate positions.
- Keep render-loop allocations to a minimum (module-level vector reuse). This is a strict performance constraint for `useFrame`-driven systems.
