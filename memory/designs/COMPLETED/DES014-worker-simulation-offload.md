# [DES014] Worker Offload for Boids + Water Forces

**Status:** Completed  
**Added:** 2025-12-21  
**Updated:** 2025-12-21

## Context

The main-thread fixed-step systems compute boid steering, food seeking, and water drag/current.
We want to move this CPU-heavy logic off the UI thread using the `multithreading` worker pool while
preserving the ECS↔physics source-of-truth flow.

## Goals

- Offload boid steering, food seeking, water drag, and water current calculations to worker threads.
- Keep Rapier calls on the main thread (components only).
- Minimize per-frame allocations; reuse buffers where possible.
- Ensure the simulation remains stable if workers are slow or fail.

## Non-Goals

- Moving rendering or Rapier physics integration to workers.
- Introducing shared memory (SharedArrayBuffer) at this stage.
- Changing ECS schemas or entity ownership.

## Architecture

- **Main thread (BoidsSystem):**
  - Builds a snapshot of fish + food positions/velocities into typed arrays.
  - Spawns a worker task via `multithreading.spawn(move(input), simulateStep)`.
  - Applies returned `steering` and `externalForces` to ECS entities.
  - Handles side effects (food removal + eating burst).
- **Worker:**
  - Runs a pure math kernel (`simulateStep`) that computes boid steering and water forces.
  - Returns typed arrays + a list of food indices to remove.

## Data Flow

```mermaid
flowchart LR
  A[ECS Snapshot] --> B[Worker Task: simulateStep]
  B --> C[Results: steering/external/eaten]
  C --> D[ECS Apply + Effects]
```

## Interfaces

```ts
export type SimulationInput = {
  fishCount: number;
  positions: Float32Array;
  velocities: Float32Array;
  foodCount: number;
  foodPositions: Float32Array;
  time: number;
  boids: { neighborDist: number; separationDist: number; maxSpeed: number; maxForce: number };
  bounds: { x: number; y: number; z: number };
  water: { density: number; dragCoefficient: number; crossSectionArea: number };
};

export type SimulationOutput = {
  steering: Float32Array;
  externalForces: Float32Array;
  eatenFoodIndices: number[];
};
```

## Scheduling

- Use `fixedScheduler` (60 Hz) to queue worker jobs.
- Allow only one job in flight; apply results on the next fixed-step tick.
- If a job is still running, skip new submissions and keep last applied forces.

## Error Handling

- Worker failures are logged.
- The simulation continues using the most recently applied forces.

## Performance Notes

- Reuse typed arrays on the main thread.
- Worker uses numeric math (no Three.js objects) to avoid GC pressure.
- Worker pool size initialized based on `navigator.hardwareConcurrency`.
- SharedArrayBuffer can be added later if cross-origin isolation is configured.
