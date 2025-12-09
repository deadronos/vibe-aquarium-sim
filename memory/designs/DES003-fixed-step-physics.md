---
title: Fixed-step physics for fish & boid logic
id: DES003
status: Pending
created: 2025-12-09
updated: 2025-12-09
---

## DES003 — Fixed-step physics for fish & boid logic

Status: **Pending**

## Summary

Fish in the sim appear to move "erratically" when the physics and steering logic are stepped using the variable render delta (per-frame dt). This design documents why variable-step integration causes unstable/visually-jumpy motion and recommends a fixed-step physics loop combined with interpolation and synchronized boids logic for determinism, stability, and smooth visuals.

## Problem: Why variable-step feels "erratic"

- Variable dt → inconsistent integration: larger dt produces bigger position/velocity jumps and different collision responses.
- Steering/impulses applied per-frame with variable dt can amplify or under-apply forces depending on frame timing.
- Render jitter + uneven physics updates causes visual popping when collisions or corrective impulses occur.

These issues combine under fluctuating frame-rate conditions (throttled CPU/GPU or tab/hardware variance) and cause fish to appear to snap, jitter or behave non-deterministically.

## What fixed-step buys you

- **Stability:** same inputs produce consistent motion across frames.
- **Determinism:** easier to reproduce and tune behavior across runs and platforms.
- **Better collisions:** smaller and regular integration steps reduce tunneling and unstable bounce responses.
- **Easier force control:** steering forces applied per-step produce consistent magnitudes and predictable acceleration.

## Decoupling patterns — practical options

1. Fixed-step physics + interpolation (recommended)
   - Use a fixed timestep (e.g., 1/60 or 1/120 seconds).
   - Accumulate render dt each frame and run physics sub-steps: while (acc >= step) { physicsStep(); acc -= step }
   - After stepping, render an interpolated transform between the previous and current physics states using alpha = acc / step.
   - Run boids/steering logic inside the fixed-step loop so behavior and collisions are synchronized.

2. Fixed-step logic, frame-tied physics (partial improvement)
   - Run boids/steering at a fixed tick but leave Rapier stepping tied to the render loop.
   - Lower risk to integrate; may still show physics variability, but steering becomes stable.

3. Full decoupling (worker thread / dedicated physics loop)
   - Run physics & boids on a separate worker at a fixed tick; post state to main thread for rendering.
   - Highest complexity, best isolation and stability. Useful for very large counts or CPU-bound simulations.

## Implementation guidance (repo-specific rules)

- Keep `Rapier` as the source of truth — do not directly write `entity.position` in systems. Apply impulses/forces or set velocity on the `RigidBody` instead.
- Move steering/boid logic currently executed per-frame in `src/systems/BoidsSystem.tsx` into the fixed-step scheduler so both steering and physics are synchronized.
- `src/components/Fish.tsx` continues to read the RigidBody position and write back to the ECS; add interpolation when the physics rate < render rate to smooth visuals.
- Typical step: `1/60` is reasonable; `1/120` may help high-speed or collision-heavy scenes. Cap max sub-steps per frame (for example 3–5) to avoid spirals of death.
- Clamp impulses/forces per-step to avoid large corrective bursts that can appear as teleportation.
- Reuse temporary vectors to avoid allocations in tight loops (follow existing repo performance rules).

## Requirements (EARS-style)

- WHEN the simulation runs at any frame-rate, THE SYSTEM SHALL produce predictable fish trajectories (no visible teleportation) [Acceptance: same seed + inputs across runs produce identical trajectories with fixed-step enabled].
- WHEN CPU load varies, THE SYSTEM SHALL limit per-frame physics sub-steps to prevent unbounded catch-up (maxSubsteps) [Acceptance: frame overloads do not freeze UI and physics gracefully degrades].
- WHEN rendering with higher-than-physics framerate, THE SYSTEM SHALL provide smooth visuals via interpolation [Acceptance: no visible stutter when physics tick < render tick].

## Acceptance tests / Validation

- Toggle `fixed-step` on/off — verify movement is stable under variable FPS (30, 60, 144) and under synthetic CPU load.
- Enable a high-precision mode (`1/120`) and verify collision stability and reduced tunneling for fast-moving fish.
- Measure determinism: run the same scenario multiple times and assert near-identical trajectories when fixed-step is enabled.

## Implementation plan (high level)

1. Add a fixed-step scheduler service that accumulates dt and runs physics sub-steps in a loop (configurable step and max substeps).
2. Move boids/steering logic to run inside the fixed-step loop; ensure all force/impulse calculations are per-step safe and clamped.
3. Optionally add interpolation in `Fish.tsx` so the renderer smoothly blends between previous and current physics states.
4. Add a runtime toggle and validation tests to compare variable-step vs fixed-step behavior.

## Risks & trade-offs

- Higher CPU usage when increasing the physics rate (1/120) — requires profiling and possibly splitting logic across a worker.
- Implementation complexity if fully decoupling physics to a worker; prefer incremental approach beginning with boids logic fixation.

## Next steps

- Start a small experiment: run boids at a fixed tick while leaving Rapier's stepping unchanged — verify observable regressions/improvements.
- If successful, complete the scheduler and interpolation changes and add tests.
