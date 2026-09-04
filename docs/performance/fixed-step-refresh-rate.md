# Fixed-step refresh-rate evidence

Issue #141 requires fish trajectories to remain equivalent when the browser
renders at 30 Hz, 60 Hz, or 120 Hz. The production path uses Rapier's fixed
`1/60`-second timestep; render frames provide elapsed time to Rapier's
accumulator, which owns the fixed-step count.

## Deterministic harness

The test-only harness in `tests/support/fixedStepTrajectory.ts` models Rapier's
fixed-step accumulator and drives the production `FixedStepScheduler`,
`applyFishPhysicsStep`, and `syncFishPhysicsState` helpers at each before-step
boundary. It uses the same initial position/velocity and queues the same
steering and external force on every fixed tick. A minimal rigid-body double
integrates position after the production velocity update so the harness can
compare complete position and velocity traces without GPU timing noise.

Run the focused evidence suite with:

```bash
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-issue141-refresh.localstorage' \
  npm test -- --maxWorkers=1 tests/fixedStepTrajectory.test.ts
```

The suite verifies:

- 30, 60, and 120 render frames per second each produce exactly 60 fixed
  control ticks per simulated second.
- Every scheduler callback receives the exact production `1 / 60` fixed-step
  delta.
- Every fixed-tick position and velocity component matches across rates within
  `1e-9`, including the final sample.
- Queued steering and external-force vectors are consumed on every fixed tick.
- Replaying the same 60 Hz scenario produces an identical full tick trace.
- Unsupported rates and non-positive durations fail before simulation setup.

The current result is eight passing tests (three parameterized rate checks plus
final equivalence, full-trace equivalence, force consumption, replay, and
validation checks). This is numerical fixed-step evidence; it does not claim
WebGPU/WebGL visual parity, which remains tracked by issue #140.

## Manual extension procedure

When changing fixed-step scheduling or fish force lifecycle:

1. Run the focused harness and inspect any tick-count or tolerance failure.
2. Run the full Vitest suite with a unique Node 26 local-storage file.
3. Run the production-preview smoke suite to catch renderer, asset, or browser
   errors that numerical tests cannot observe.
4. Record any intentional tolerance change in the pull request and keep the
   deterministic initial state unchanged unless the scenario itself is the
   subject of the test.
