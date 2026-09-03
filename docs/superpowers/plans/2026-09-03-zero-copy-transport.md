# Production Zero-Copy Boids Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a transferable ping-pong worker transport for non-isolated production pages while preserving SharedArrayBuffer as the preferred path and making the active transport observable.

**Architecture:** Keep the boids algorithm and `SimulationInput`/`SimulationOutput` contracts unchanged. Add a transfer-buffer module that owns raw `ArrayBuffer` slots and protocol guards, extend the worker protocol with transfer-job/transfer-success messages, and let `WorkerOrchestrator` select `shared`, `transfer`, `copy`, or `main-thread` with explicit slot ownership. Diagnostics and benchmark helpers remain outside the frame loop.

**Tech Stack:** TypeScript, Web Workers, transferable `ArrayBuffer`, SharedArrayBuffer, Vitest, Playwright, Vite preview server.

---

### Task 1: Implement transferable buffer slots and protocol types

**Files:**

- Create: `src/workers/boids/transferBuffers.ts`.
- Modify: `src/workers/boids/types.ts` only if a shared metadata alias prevents duplicate protocol fields.
- Test: `tests/transferBuffers.test.ts`.

- [ ] **Step 1: Write failing ownership and payload tests**

  Add tests that create a slot for 2 fish/1 food, copy a `SimulationInput`
  snapshot into it, serialize a transfer payload, hydrate the payload, and
  assert that all numeric values and capacities survive. Add a capacity-growth
  test proving an existing slot is reused below capacity and replaced above
  capacity. Add a test that a slot can be marked `in-flight`, returned as
  `pending-result`, and released exactly once.

- [ ] **Step 2: Run the focused test and verify it fails**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-transfer-buffers.localstorage' npm run test -- tests/transferBuffers.test.ts
  ```

  Expected: import/export failures because the transfer module does not exist.

- [ ] **Step 3: Implement the slot module**

  Define `TransferableSimulationBuffers`, `TransferableSimulationBufferPayload`,
  `TransferableSimulationJobMessage`, and `TransferableSimulationSuccessMessage`.
  Allocate capacity-sized `ArrayBuffer`s for positions, velocities, model
  indices, food positions, steering, external forces, eaten-food indices, and
  the eaten-food count. Export helpers to create/grow slots, copy reusable
  snapshots into host-owned views, serialize raw buffers plus a transfer list,
  hydrate returned buffers, and create `SimulationOutput`/`SimulationInput`
  views without copying.

- [ ] **Step 4: Run focused tests and commit**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-transfer-buffers.localstorage' npm run test -- tests/transferBuffers.test.ts
  git add src/workers/boids/transferBuffers.ts src/workers/boids/types.ts tests/transferBuffers.test.ts
  git commit -m "feat: add transferable boids buffer slots"
  ```

### Task 2: Extend the worker protocol without changing simulation math

**Files:**

- Modify: `src/workers/boids/sharedBuffers.ts` to add transfer message unions and type guards, or move shared unions into a focused protocol module if that avoids coupling.
- Modify: `src/workers/boids.worker.ts` to hydrate transfer jobs, run `simulateStep` with transfer output views, and transfer the slot back.
- Test: `tests/transferWorkerProtocol.test.ts`.

- [ ] **Step 1: Write failing worker protocol tests**

  Add a deterministic test that builds a transfer job from a known input,
  hydrates it as worker input, runs `simulateStep` into its output target, and
  asserts the returned transfer-success metadata and output values. Add guard
  tests for transfer-job, transfer-success, shared-job, and cloned success
  discrimination.

- [ ] **Step 2: Run the focused test and verify it fails**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-transfer-protocol.localstorage' npm run test -- tests/transferWorkerProtocol.test.ts
  ```

- [ ] **Step 3: Implement transfer message handling**

  Extend `BoidsWorkerMessage` and `BoidsWorkerResponse` with `transfer-job` and
  `mode: 'transfer'`. In the worker, hydrate the transfer payload, create an
  output target over the transferred arrays, call the existing `simulateStep`,
  and post the same raw buffers back in the transfer list with snapshot
  revision, fish/food counts, and eaten-food count. Keep shared and cloned
  branches unchanged and route all exceptions through the existing error
  response.

- [ ] **Step 4: Run focused tests and commit**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-transfer-protocol.localstorage' npm run test -- tests/transferWorkerProtocol.test.ts
  npm run typecheck
  git add src/workers/boids/sharedBuffers.ts src/workers/boids.worker.ts tests/transferWorkerProtocol.test.ts
  git commit -m "feat: support transferable boids worker messages"
  ```

### Task 3: Select transports and enforce slot lifecycle in the orchestrator

**Files:**

- Modify: `src/systems/boids/workerOrchestrator.ts`.
- Modify: `src/declarations.d.ts` for transport status types.
- Test: `tests/workerOrchestrator.test.ts`.

- [ ] **Step 1: Write failing orchestrator tests**

  Mock `Worker` with controllable `postMessage`, `onmessage`, `onerror`, and
  `terminate` handlers. Assert mode selection for isolated SharedArrayBuffer,
  non-isolated transferable workers, transfer-post failure to cloned copy, and
  no-worker main-thread fallback. Assert a transfer job includes a transfer
  list, returned output is exposed through `getPendingResult`, and the slot is
  not reusable until `clearPendingResult`.

  Add tests for capacity growth, repeated submissions, stale snapshot result
  handling, worker errors that invalidate detached slots, and the invariant that
  `postMessage` is never called for a second job while one is busy.

- [ ] **Step 2: Run focused tests and verify they fail**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-orchestrator.localstorage' npm run test -- tests/workerOrchestrator.test.ts
  ```

- [ ] **Step 3: Implement transport selection and lifecycle**

  Add explicit `transportMode`, two transfer slots, active/pending slot indexes,
  and a slot invalidation path. Select SharedArrayBuffer first, then transfer
  buffers, then cloned worker messages; retain main-thread simulation if worker
  construction is unavailable. On transfer submit, copy snapshot views into a
  free slot and post all numeric `ArrayBuffer`s as transferables. On success,
  hydrate the returned slot and expose its output views. Release the slot only
  from `clearPendingResult`; invalidate detached slots after post/worker errors.
  Never replace an in-flight slot during growth and never read a buffer after it
  has been transferred away.

- [ ] **Step 4: Publish transport status and run focused tests**

  Publish `window.__vibe_transportStatus` on mode changes, capacity growth,
  job submission/completion, and errors. Include mode, isolation support,
  capacities, submitted/completed/error counts, busy state, and the latest
  reason. Run the focused tests and typecheck, then commit:

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-orchestrator.localstorage' npm run test -- tests/workerOrchestrator.test.ts
  npm run typecheck
  git add src/systems/boids/workerOrchestrator.ts src/declarations.d.ts tests/workerOrchestrator.test.ts
  git commit -m "feat: use transferable fallback for boids workers"
  ```

### Task 4: Add diagnostics and transport benchmark evidence

**Files:**

- Modify: `src/utils/perfDebug.ts` and `src/components/DebugHUD.tsx` to expose transport mode/counters when diagnostics are enabled.
- Modify: `src/declarations.d.ts` for the collector transport field.
- Create: `tests/workerTransport.bench.test.ts`.
- Test: `tests/DebugHUD.test.tsx` and `tests/workerTransport.bench.test.ts`.

- [ ] **Step 1: Write failing diagnostics and benchmark tests**

  Assert that `ensurePerfDebug` initializes an optional transport snapshot,
  reset/download preserve it, and the Debug HUD displays the active mode without
  creating frame-loop samples. Add a benchmark test that warms up and runs 50
  iterations at 100, 1,000, and 5,000 fish, logging cloned preparation versus
  transferable preparation averages without a brittle threshold.

- [ ] **Step 2: Implement diagnostics and benchmark harness**

  Mirror the orchestrator status into the opt-in collector and render a compact
  transport line in Debug HUD. Keep all status updates event-driven and outside
  `useFrame`. Reuse the existing benchmark input factory and measure only host
  preparation/round-trip simulation overhead, clearly labeling synthetic
  in-process results.

- [ ] **Step 3: Run focused tests and commit**

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-transport-bench.localstorage' npm run test -- tests/DebugHUD.test.tsx tests/workerTransport.bench.test.ts
  npm run lint -- --max-warnings=0
  git add src/utils/perfDebug.ts src/components/DebugHUD.tsx src/declarations.d.ts tests/DebugHUD.test.tsx tests/workerTransport.bench.test.ts
  git commit -m "feat: expose boids transport diagnostics"
  ```

### Task 5: Add deployed-style smoke coverage, documentation, and handoff

**Files:**

- Modify: `tests/e2e/smoke.spec.ts` for non-isolated transport status and no-overlap assertions.
- Create: `docs/performance/zero-copy-transport.md` with modes, ownership rules, and benchmark commands/results.
- Modify: `memory/activeContext.md`, `memory/progress.md`, and this plan.

- [ ] **Step 1: Write the failing browser smoke assertion**

  Add a test that starts the production preview on the default non-isolated
  page, waits for `window.__vibe_transportStatus.mode` to become `transfer` (or
  `copy` only when the browser reports transferable workers unavailable), checks
  `busy`/job counters for no overlap, and preserves the existing page-error and
  404 checks.

- [ ] **Step 2: Run the smoke test to verify the assertion fails**

  ```bash
  npm run build
  npm run test:smoke -- --grep "transport"
  ```

- [ ] **Step 3: Implement smoke/status documentation**

  Document that snapshot views are copied into owned transfer slots, returned
  slots remain pending until result application, detached slots are invalidated,
  and SharedArrayBuffer remains preferred under isolation. Record the observed
  100/1,000/5,000-fish benchmark output and the preview smoke procedure.

- [ ] **Step 4: Run the complete validation matrix and commit handoff docs**

  ```bash
  npm run format:check
  npm run lint -- --max-warnings=0
  npm run typecheck
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase4-final.localstorage' npm run test
  npm run build
  npm run check:bundle
  npm run test:smoke
  git diff --check
  git add docs/performance/zero-copy-transport.md memory/activeContext.md memory/progress.md docs/superpowers/plans/2026-09-03-zero-copy-transport.md
  git commit -m "docs: document zero-copy transport phase"
  ```

- [ ] **Step 5: Push, open the PR, and update tracking**

  Push `codex/phase4-zero-copy-transport`, open a ready-for-review PR against
  `main`, comment on issue #142 with the PR and validation evidence, and leave
  #142 open until the production transport and benchmark evidence are reviewed.
