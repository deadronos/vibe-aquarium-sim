# Production zero-copy boids transport design

## Goal

Make the boids worker use a zero-copy transport on the deployed GitHub Pages
fallback while preserving the existing SharedArrayBuffer path whenever the page
is cross-origin isolated. The transport must remain renderer-independent,
bounded, observable, and safe when jobs, buffers, or workers fail.

## Scope

This design addresses issue #142. It covers the browser worker protocol, buffer
ownership, capacity growth, fallback diagnostics, and repeatable 100/1,000/
5,000-fish transport benchmarks. It does not change the boids algorithm,
fixed-step scheduling policy, renderer behavior, or fish asset loading.

## Transport selection

The orchestrator resolves one active mode at construction time:

1. `shared` when `SharedArrayBuffer` exists and `crossOriginIsolated` is true;
2. `transfer` when a worker and transferable `ArrayBuffer` are available;
3. `copy` when transfer setup or posting fails but the worker remains usable;
4. `main-thread` when workers cannot be created.

The existing SharedArrayBuffer implementation remains the first choice. The
new transferable path is the production fallback for GitHub Pages and never
pretends that a detached buffer is readable. A transport status snapshot
reports the active mode, isolation capability, capacities, submitted/completed
jobs, and the latest fallback/error reason.

## Transferable protocol

`src/workers/boids/transferBuffers.ts` owns the transfer-specific types and
slot lifecycle. Two ping-pong slots each contain capacity-sized raw
`ArrayBuffer`s for positions, velocities, model indices, food positions,
steering, external forces, and eaten-food indices. The host copies the current
reusable snapshot views into a free slot before posting. Simulation metadata
(species, bounds, water, current, and scalar counts) remains structured-cloned
because it is small and immutable for the job.

The host posts a `transfer-job` with all numeric buffers in the transfer list.
The worker hydrates typed-array views, runs the existing `simulateStep` into the
slot output views, and posts a `transfer-success` that transfers the same slot
buffers back with the snapshot revision and eaten-food count. The host exposes
the returned output views through the existing `SimulationOutput` contract and
does not release the slot until `clearPendingResult` runs after result
application.

Only one job may be in flight for the orchestrator. A slot is therefore in
exactly one state: `free`, `in-flight`, or `pending-result`. If a post or worker
operation fails after transfer, the in-flight slot is invalidated instead of
read; the orchestrator switches to the cloned `copy` mode for the next job.
Worker errors clear busy state, preserve the snapshot guard, and cannot cause a
second submission before the previous job has been resolved.

When a fish or food count exceeds a slot capacity, a new slot is allocated with
the existing 1.5x growth policy. In-flight slots are never replaced or resized;
the next free slot grows independently, preventing detached-buffer reads and
preserving repeated submissions.

## Diagnostics and validation

Transport status is published on `window.__vibe_transportStatus` and mirrored
in the opt-in debug collector without per-frame allocations. The status is
updated on mode changes, capacity growth, job completion, and errors. The
Debug HUD can show the active mode and counters when the collector is enabled.

Unit tests cover mode selection, payload round trips, ownership transitions,
capacity growth, repeated submissions, worker errors, and detached-buffer
invalidation. A deterministic benchmark harness runs 50 warmed iterations at
100, 1,000, and 5,000 fish, comparing cloned-message packing with transferable
packing and reporting average host-side preparation/round-trip overhead. The
benchmark is evidence only; it does not set a fragile performance threshold.

The full project checks remain required: format, lint, typecheck, unit tests,
coverage, production build, bundle budgets, and preview smoke. Browser smoke
asserts that the deployed-style non-isolated page reports `transfer` (or an
explicit `copy` fallback if the browser lacks transferable workers), never
reports overlapping jobs, and has no page errors or failed asset responses.
