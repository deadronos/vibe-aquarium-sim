# Issue 141 Refresh-Rate Equivalence Design

## Goal

Prove that the fish control path produces equivalent trajectories when the
display presents frames at 30 Hz, 60 Hz, or 120 Hz. The test must exercise the
production `FixedStepScheduler`, `applyFishPhysicsStep`, and
`syncFishPhysicsState` contracts without adding runtime instrumentation or
allocations to the aquarium.

## Requirements

1. WHEN a deterministic fish input is simulated for the same elapsed time, THE
   SYSTEM SHALL execute the same number of 1/60-second control ticks at 30,
   60, and 120 render frames. Acceptance: each schedule records 60 ticks per
   simulated second.
2. WHEN the same initial position, velocity, and per-tick queued forces are
   used, THE SYSTEM SHALL produce matching position and velocity trajectories
   across 30/60/120 Hz schedules. Acceptance: every fixed-tick component
   differs by no more than `1e-9` in the deterministic harness.
3. WHEN the harness is run twice with the same inputs, THE SYSTEM SHALL produce
   identical tick traces. Acceptance: the two traces compare equal without a
   tolerance.
4. WHEN a fish control tick completes, THE SYSTEM SHALL preserve the existing
   Rapier source-of-truth lifecycle: controls are applied before integration and
   ECS state is synchronized after integration. Acceptance: the harness calls
   the production helper pair and verifies queued forces are consumed on every
   tick.

## Chosen approach

Use a test-only deterministic trajectory harness rather than browser frame
emulation. Browser timing and GPU availability make a Playwright-only test
too noisy for numerical equivalence, while a second Rapier implementation
would duplicate engine behavior. The harness uses a minimal rigid-body double
only for deterministic position integration; all control, clamping, force
consumption, and ECS synchronization logic remains production code.

## Architecture and data flow

```text
render-rate schedule (30/60/120 Hz)
             |
             v
     FixedStepScheduler.update(delta)
             |
             v  (exactly 1/60 s per callback)
 queue deterministic forces -> applyFishPhysicsStep
             |
             v
      integrate rigid-body state
             |
             v
       syncFishPhysicsState -> trace sample
```

The harness lives under `tests/support/` and is never imported by the app
bundle. A focused Vitest suite compares tick counts, final state, and full
traces. `docs/performance/fixed-step-refresh-rate.md` records the command,
scenario, tolerance, and measured result so future changes have a repeatable
regression procedure.

## Error handling and boundaries

- The harness rejects unsupported render rates and non-positive durations.
- It fails if a schedule does not produce the expected fixed-tick count.
- It uses the same tank bounds and speed clamps as production helpers; any
  unexpected boundary correction is included in the trace rather than hidden.
- It does not claim to validate GPU interpolation or WebGPU visual parity;
  those remain tracked by issue #140.

## Validation strategy

- Red: add the focused trajectory test before the support harness exists and
  confirm the missing-module failure.
- Green: implement the smallest harness that calls the production scheduler
  and fish physics helpers, then verify 30/60/120 equivalence.
- Regression: run the full Vitest suite, format/lint/typecheck/build, bundle
  budgets, and browser smoke checks before handoff.
