# Boids worker transport

The boids worker chooses the least-copying transport available at startup:

| Mode          | When it is selected                                          | Ownership model                                                                                                                                                     |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared`      | `SharedArrayBuffer` exists and `crossOriginIsolated` is true | One shared set of input/output views is initialized once and reused.                                                                                                |
| `transfer`    | A Worker exists on a non-isolated page                       | The host copies each reusable snapshot into one of two owned `ArrayBuffer` slots, transfers every numeric buffer to the worker, and receives the same storage back. |
| `copy`        | Transfer posting fails or a transfer slot is unavailable     | The worker receives the existing structured-cloned `SimulationInput`.                                                                                               |
| `main-thread` | Worker construction is unavailable                           | `simulateStep` runs synchronously as the final fallback.                                                                                                            |

The host never transfers the reusable snapshot views from `snapshot.ts`: doing so
would detach the buffers used by the next fixed-step snapshot. Transfer slots are
owned by the orchestrator and move through `free → in-flight → pending-result →
free`. A result remains pending until `BoidsSystem` applies it and calls
`clearPendingResult()`. If a post or worker error occurs after transfer, the
detached slot is marked invalid and the orchestrator switches to `copy`; it never
reads a detached view or replaces an in-flight slot during capacity growth.

## Diagnostics

The active mode and counters are available in development builds as
`window.__vibe_transportStatus`:

```ts
{
  mode: 'shared' | 'transfer' | 'copy' | 'main-thread',
  isolationSupported: boolean,
  fishCapacity: number,
  foodCapacity: number,
  submitted: number,
  completed: number,
  errors: number,
  overlapCount: number,
  busy: boolean,
  latestReason: string | null
}
```

When the opt-in Debug HUD is mounted, the same stable status object is mirrored
into `window.__vibe_debug.transport` and included in a downloaded trace. Status
updates happen on transport events; no per-frame telemetry object is allocated.

## Synthetic preparation benchmark

Run the benchmark with:

```bash
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-transport-bench.localstorage' \
  npm run test -- tests/workerTransport.bench.test.ts --reporter=verbose
```

The benchmark warms five iterations and measures 50 host-preparation iterations
at each size. It compares `structuredClone(SimulationInput)` with copying into
an owned transfer slot plus building the transfer list. It is synthetic and does
not claim to measure browser IPC or GPU time.

Observed locally on 2026-09-03:

|  Fish | Clone average | Transfer packing average |
| ----: | ------------: | -----------------------: |
|   100 |      0.005 ms |                 0.001 ms |
| 1,000 |      0.008 ms |                 0.001 ms |
| 5,000 |      0.015 ms |                 0.002 ms |

The test intentionally records finite measurements without a hard threshold;
use a browser Performance trace for production IPC and frame-time conclusions.

## Preview smoke check

Build and run the deployed-style preview, then run `npm run test:smoke`. The
default preview is non-isolated, so Chromium should report `transfer` and a
zero `overlapCount` while the aquarium schedules work. A `copy` mode is valid
only when the browser rejects transferable worker messages. The smoke test also
continues to assert that the shell has no page errors or missing assets.
