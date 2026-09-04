# Fixed-step refresh-rate evidence

Issue #141 requires fish trajectories to remain equivalent when the browser
renders at 30 Hz, 60 Hz, or 120 Hz. The production path uses Rapier's fixed
`1/60`-second timestep; render frames only determine how many fixed ticks are
requested by the scheduler.

## Deterministic harness

The test-only harness in `tests/support/fixedStepTrajectory.ts` drives the
production `FixedStepScheduler`, `applyFishPhysicsStep`, and
`syncFishPhysicsState` helpers. It uses the same initial position/velocity and
queues the same steering and external force on every fixed tick. A minimal
rigid-body double integrates position after the production velocity update so
the harness can compare complete position and velocity traces without adding
runtime code or GPU timing noise.

Run the focused evidence suite with:

```bash
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-issue141-refresh.localstorage' \
  npm test -- --maxWorkers=1 tests/fixedStepTrajectory.test.ts
```

The suite verifies:

- 30, 60, and 120 render frames per second each produce exactly 60 fixed
  control ticks per simulated second.
- Final position and velocity components match across rates within `1e-9`.
- Replaying the same 60 Hz scenario produces an identical full tick trace.
- Unsupported rates and non-positive durations fail before simulation setup.

The current result is six passing assertions (three parameterized rate checks
plus equivalence, replay, and validation checks). This is numerical fixed-step
evidence; it does not claim WebGPU/WebGL visual parity, which remains tracked
by issue #140.

## Manual extension procedure

When changing fixed-step scheduling or fish force lifecycle:

1. Run the focused harness and inspect any tick-count or tolerance failure.
2. Run the full Vitest suite with a unique Node 26 local-storage file.
3. Run the production-preview smoke suite to catch renderer, asset, or browser
   errors that numerical tests cannot observe.
4. Record any intentional tolerance change in the pull request and keep the
   deterministic initial state unchanged unless the scenario itself is the
   subject of the test.
