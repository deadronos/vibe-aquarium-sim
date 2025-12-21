# [TASK012] Offload boids + water forces to multithreading workers

**Status:** Completed  
**Added:** 2025-12-21  
**Updated:** 2025-12-21

## Original Request

Move as much logic as possible to workers (multiple if needed) using the new `multithreading` package; research the README and implement the offload.

## Thought Process

- Boids + food seeking + water drag/current are the heaviest fixed-step loops and can be moved to workers.
- Keep Rapier calls on the main thread; workers compute numeric outputs only.
- Avoid overlapping worker jobs; apply results on the next fixed-step tick.
- Use typed arrays for snapshots to keep data transfer compact and predictable.

## Implementation Plan

1. Define worker kernel (`simulateStep`) with pure math inputs/outputs and typed arrays.
2. Refactor BoidsSystem to snapshot ECS data, spawn worker tasks, and apply results + food removals.
3. Update App system wiring to avoid double-applying water forces.
4. Validate with format + lint, update memory docs.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description                                        | Status    | Updated    | Notes |
| --- | -------------------------------------------------- | --------- | ---------- | ----- |
| 1.1 | Add worker kernel (simulateStep)                   | Completed | 2025-12-21 |       |
| 1.2 | Refactor BoidsSystem to use worker + apply results | Completed | 2025-12-21 |       |
| 1.3 | Update App wiring + run format/lint                | Completed | 2025-12-21 |       |
| 1.4 | Update memory docs (active/progress/design)        | Completed | 2025-12-21 |       |

## Progress Log

### 2025-12-21

- Task created; design/requirements drafted for worker offload.
- Implemented worker kernel + BoidsSystem integration; removed main-thread water systems from App.
- Ran format and lint; finalized design/task status updates.
