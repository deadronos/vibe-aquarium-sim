# Issue 141 Refresh-Rate Equivalence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic evidence that the production fixed-step fish control path produces equivalent trajectories at 30, 60, and 120 Hz render schedules.

**Architecture:** Rapier's before-step boundary drives `FixedStepScheduler.step()` exactly once per fixed physics tick. A deterministic harness will model that boundary with constant render deltas, queue deterministic forces for each fixed tick, call the production `applyFishPhysicsStep` and `syncFishPhysicsState` helpers, and integrate a minimal rigid-body double. Documentation records the tolerance and procedure.

**Tech Stack:** TypeScript, Three.js `Vector3`, Vitest, `FixedStepScheduler`, fish physics helpers, Markdown documentation.

---

### Task 1: Define the failing trajectory contract

**Files:**

- Create: `tests/fixedStepTrajectory.test.ts`
- Create: `tests/support/fixedStepTrajectory.ts`

- [x] **Step 1: Write the failing test**

Create a Vitest suite that imports `runFixedStepTrajectory` from the not-yet-created support module and asserts the required behavior:

```ts
import { describe, expect, it } from 'vitest';
import { runFixedStepTrajectory } from './support/fixedStepTrajectory';

describe('fixed-step refresh-rate trajectory', () => {
  it.each([30, 60, 120])('executes 60 fixed ticks per second at %d Hz', (renderHz) => {
    const trace = runFixedStepTrajectory({ renderHz, durationSeconds: 1 });
    expect(trace.tickCount).toBe(60);
  });

  it('keeps final position and velocity equivalent across display rates', () => {
    const traces = [30, 60, 120].map((renderHz) =>
      runFixedStepTrajectory({ renderHz, durationSeconds: 2 })
    );
    const baseline = traces[0]!.final;

    for (const trace of traces.slice(1)) {
      expect(trace.final.position.x).toBeCloseTo(baseline.position.x, 9);
      expect(trace.final.position.y).toBeCloseTo(baseline.position.y, 9);
      expect(trace.final.position.z).toBeCloseTo(baseline.position.z, 9);
      expect(trace.final.velocity.x).toBeCloseTo(baseline.velocity.x, 9);
      expect(trace.final.velocity.y).toBeCloseTo(baseline.velocity.y, 9);
      expect(trace.final.velocity.z).toBeCloseTo(baseline.velocity.z, 9);
    }
  });

  it('keeps every fixed-tick trajectory sample equivalent across display rates', () => {
    const traces = renderRates.map((renderHz) =>
      runFixedStepTrajectory({ renderHz, durationSeconds: 2 })
    );
    const baseline = traces[0]!.samples;

    for (const trace of traces.slice(1)) {
      expect(trace.samples).toHaveLength(baseline.length);
      for (let tick = 0; tick < baseline.length; tick++) {
        const expected = baseline[tick]!;
        const actual = trace.samples[tick]!;
        expect(actual.position.x).toBeCloseTo(expected.position.x, 9);
        expect(actual.position.y).toBeCloseTo(expected.position.y, 9);
        expect(actual.position.z).toBeCloseTo(expected.position.z, 9);
        expect(actual.velocity.x).toBeCloseTo(expected.velocity.x, 9);
        expect(actual.velocity.y).toBeCloseTo(expected.velocity.y, 9);
        expect(actual.velocity.z).toBeCloseTo(expected.velocity.z, 9);
      }
    }
  });

  it('replays an identical tick trace for identical inputs', () => {
    const first = runFixedStepTrajectory({ renderHz: 60, durationSeconds: 2 });
    const second = runFixedStepTrajectory({ renderHz: 60, durationSeconds: 2 });
    expect(second).toEqual(first);
  });

  it('rejects unsupported rates and non-positive durations', () => {
    expect(() => runFixedStepTrajectory({ renderHz: 59, durationSeconds: 1 })).toThrow(
      'renderHz must be 30, 60, or 120'
    );
    expect(() => runFixedStepTrajectory({ renderHz: 60, durationSeconds: 0 })).toThrow(
      'durationSeconds must be positive'
    );
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```bash
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-issue141-red.localstorage' npm test -- --maxWorkers=1 tests/fixedStepTrajectory.test.ts
```

Expected: Vitest fails during module resolution because `tests/support/fixedStepTrajectory.ts` does not exist yet.

- [x] **Step 3: Commit the red test**

```bash
git add tests/fixedStepTrajectory.test.ts
git commit -m "test: define refresh-rate trajectory contract"
```

### Task 2: Implement the deterministic harness

**Files:**

- Create: `tests/support/fixedStepTrajectory.ts`
- Modify: `src/utils/FixedStepScheduler.ts`
- Modify: `src/systems/SchedulerSystem.tsx`

- [x] **Step 1: Implement the minimal rigid-body double and scenario runner**

Implement `runFixedStepTrajectory` with these exact contracts:

```ts
export interface TrajectoryRequest {
  renderHz: 30 | 60 | 120;
  durationSeconds: number;
}

export interface TrajectorySnapshot {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export interface TrajectoryTrace {
  tickCount: number;
  final: TrajectorySnapshot;
  samples: TrajectorySnapshot[];
  fixedDeltas: number[];
  forceQueuesCleared: boolean;
}

export function runFixedStepTrajectory(request: TrajectoryRequest): TrajectoryTrace;
```

Use `FixedStepScheduler(1 / 60, 5)`, a deterministic fish entity with fixed
initial position/velocity, and a rigid-body double whose `integrate(dt)`
advances position from its current velocity. In each scheduler callback, queue
the same steering and external force, call `applyFishPhysicsStep`, integrate
the body, call `syncFishPhysicsState`, and copy one plain snapshot into the
trace. Drive exactly `renderHz * durationSeconds` render frames with delta
`1 / renderHz`; for each simulated Rapier fixed step, call
`FixedStepScheduler.step()` once before the production fish helper pair.
Record every callback delta and verify it is exactly `1 / 60`. Validate the
rate and duration before constructing state.

- [x] **Step 2: Run the focused test to verify it passes**

Run the same command from Task 1. Expected: all eight tests pass, with 60 fixed ticks at each display rate, an exact `1 / 60` callback delta, and identical deterministic traces.

The final focused suite also compares every fixed-tick sample across rates and
asserts that both queued force vectors are cleared on every callback.

- [x] **Step 3: Commit the harness**

```bash
git add tests/support/fixedStepTrajectory.ts tests/fixedStepTrajectory.test.ts
git commit -m "test: add fixed-step refresh-rate trajectory harness"
```

### Task 3: Document the evidence and source-of-truth contract

**Files:**

- Create: `docs/performance/fixed-step-refresh-rate.md`
- Modify: `docs/agents/architecture.md`

- [x] **Step 1: Write the regression procedure and measured result**

Document the focused command, the deterministic input scenario, the 1/60-second tick contract, the `1e-9` comparison tolerance, and the expected 30/60/120 result. State explicitly that the harness validates numerical fixed-step equivalence, not GPU/WebGPU visual parity.

- [x] **Step 2: Correct the architecture source-of-truth loop**

Update the stale Fish lifecycle description so it states:

1. ECS systems queue forces/target velocity.
2. `useBeforePhysicsStep` consumes queued controls immediately before each Rapier fixed step.
3. Rapier advances and resolves collisions.
4. `useAfterPhysicsStep` mirrors authoritative position/velocity into ECS and applies the tank boundary safety net.
5. `useFrame` is render-rate diagnostics/visual work only and never drives physics.

- [x] **Step 3: Run documentation-focused validation**

Run:

```bash
npm run format:check
npm run lint -- --max-warnings=0
npm run typecheck
git diff --check
```

The focused evidence also has a scoped TypeScript gate:

```bash
npm run typecheck:issue141
```

- [x] **Step 4: Commit documentation**

```bash
git add docs/performance/fixed-step-refresh-rate.md docs/agents/architecture.md
git commit -m "docs: record fixed-step refresh-rate evidence"
```

### Task 4: Full validation and handoff

**Files:**

- Modify: `memory/activeContext.md`
- Modify: `memory/progress.md`

- [x] **Step 1: Run the complete validation matrix**

```bash
npm run format:check
npm run lint -- --max-warnings=0
npm run typecheck
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-issue141-final.localstorage' npm test -- --maxWorkers=1
npm run build
npm run check:bundle
npm run test:smoke
git diff --check
```

- [x] **Step 2: Update project memory**

Record the issue #141 branch, the deterministic 30/60/120 evidence, the tolerance, and the remaining follow-ups (#140 visual parity and #148 browser-backed ECS/Rapier coverage).

- [ ] **Step 3: Request code review**

Review the complete branch diff against `origin/main`, address any Critical or Important findings, then prepare a PR that links #141 and the design/plan/evidence documents.

### Execution record (2026-09-04)

- Baseline: 50 test files passed, 1 skipped; 196 tests passed, 1 skipped.
- Focused red check: missing `tests/support/fixedStepTrajectory` module failed as expected.
- Focused green check: 8 trajectory tests passed, including full per-tick
  trajectory equivalence and force-queue consumption.
- Scheduler-boundary regression: the production scheduler now advances once
  from Rapier's before-step hook; focused scheduler/system/trajectory coverage
  passes (14 tests).
- Earlier full validation before the scheduler-boundary correction: format,
  lint, typecheck, 51 test files / 202 tests passed (1 skipped), build, bundle
  budgets, 7 browser smoke tests, and `git diff --check` passed. A fresh full
  matrix is required after the correction.
- Post-correction full validation: format, lint, application and scoped Issue
  #141 typechecks, 51 test files / 205 tests passed (1 skipped), build, bundle
  budgets, 7 browser smoke tests, and `git diff --check` passed.
