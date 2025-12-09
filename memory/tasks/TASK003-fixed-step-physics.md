# [TASK003] - Implement Fixed-step Physics & Boid Logic

**Status:** Pending  
**Added:** 2025-12-09  
**Updated:** 2025-12-09  
**Related Design:** [DES003] Fixed-step physics (fish & boid logic)

## Original Request

Implement the fixed-step physics and boid logic changes described in DES003. The goal is to stabilize fish motion by moving steering/boids logic into a fixed physics tick, adding optional interpolation for rendering, and validating determinism and performance.

## Thought Process

Start small and low-risk: first run boids/steering at a fixed tick while leaving Rapier stepping unchanged — this validates whether stabilizing steering inputs reduces the perceived erratic motion.

If that improves behaviour, introduce a small scheduler service that manages fixed-step advancement for physics-related logic and optionally controls Rapier stepping. Keep Rapier as the source of truth: systems should apply forces/impulses, not mutate positions. When physics ticks run slower than rendering, use interpolation in `Fish.tsx` to smooth visuals.

Keep changes incremental and testable at each step so we can measure improvements (FPS, determinism, collision stability) and pivot if needed (e.g., worker thread decoupling for scale).

## Implementation Plan — Phased

### Phase 0 — Experiment (Low risk)

- Add a toggle runtime switch `boidsFixedTick` that runs `BoidsSystem` updates at a fixed frequency (e.g., 60Hz) while leaving Rapier stepping untouched.
- Add debug overlays and logging to compare variable vs fixed behaviors.
- Validate under variable FPS and CPU load.

### Phase 1 — Scheduler + Boids

- Implement a simple fixed-step scheduler (configurable step: 1/60 or 1/120, maxSubsteps cap).
- Move boids/steering logic to run inside the scheduler loop (apply per-step impulses/velocities).
- Ensure per-step force clamping and reuse temp vectors.

### Phase 2 — Rapier stepping control (optional)

- Optionally move Rapier stepping under the scheduler so physics and boids tick in the same loop. Evaluate impact and synchronize placement carefully to preserve Rapier API contracts.

### Phase 3 — Interpolation & polish

- Add interpolation in `Fish.tsx` to smooth visuals when physics tick < render tick.
- Add runtime toggles to switch variable-step vs fixed-step behavior for regression testing.

### Phase 4 — Testing & validation

- Add automated tests covering determinism scenarios (same seed + fixed-step deterministic trajectory)
- Add integration tests that compare variable-step vs fixed-step visual stability under stress.

## Subtasks

| ID  | Description                                  | Status      | Updated    | Notes              |
| --- | -------------------------------------------- | ----------- | ---------- | ------------------ |
| 0.1 | Add `boidsFixedTick` runtime toggle + probe  | Completed   | 2025-12-09 | Experiment phase   |
| 1.1 | Implement fixed-step scheduler service       | Completed   | 2025-12-09 | Configurable TBD   |
| 1.2 | Move `BoidsSystem` into scheduler loop       | Completed   | 2025-12-09 | Force clamping     |
| 2.1 | (Optional) Move Rapier stepping to scheduler | Not Started | 2025-12-09 | Evaluate risks     |
| 3.1 | Add interpolation in `Fish.tsx`              | Not Started | 2025-12-09 | Smooth visuals     |
| 3.2 | Runtime toggles + debug overlays             | Completed   | 2025-12-09 | Removed in cleanup |
| 4.1 | Add deterministic/integration tests          | Partial     | 2025-12-09 | Vitest-based       |

## Acceptance Criteria

- [ ] Enabling fixed-step boids reduces visible jitter under variable FPS and CPU load.
- [ ] Fixed-step mode produces repeatable, near-identical trajectories when run multiple times with the same input conditions.
- [ ] Physics integration remains authoritative (no direct entity.position writes) and forces scale consistently across ticks.
- [ ] MaxSubsteps cap prevents runaway CPU usage under load.
- [ ] Interpolation smooths visuals when physics tick is lower than render tick.

## Testing & Validation

- Manual: Toggle `boidsFixedTick` and visually compare behavior with synthetic framerate and CPU noise.
- Automated: Create tests that run a short, deterministic scenario and assert position variance thresholds between runs.

## Dependencies

- Design: [DES003] memory/designs/DES003-fixed-step-physics.md
- Files to touch: `src/systems/BoidsSystem.tsx`, `src/components/Fish.tsx`, `src/store.ts`, possibly `src/utils/fixedStepScheduler.ts` and test files.

## Next steps

1. Run the Phase 0 experiment and record results (visual + perf).
2. If experiment improves behavior, implement Phase 1 scheduler and move boids.
3. Add tests and interpolation in Phase 3.

## Progress Log

### 2025-12-09

- Task created and linked to DES003.
