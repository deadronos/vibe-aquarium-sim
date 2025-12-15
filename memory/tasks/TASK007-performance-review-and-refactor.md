# TASK007: Performance Review and Refactor

## Status
**Completed** (2025-12-15)

## Context
User requested a "performance review" of the codebase. Analysis revealed render bottlenecks in the Tank glass and Fish rendering, and memory churn in the ECS/Physics loop.

## Sub-Tasks

### 1. Analysis and Reporting
-   [x] Analyzed codebase for `useFrame` usage and render bottlenecks.
-   [x] Identified `MeshTransmissionMaterial` on multiple walls as a major GPU cost.
-   [x] Identified lack of Instancing for Fish as a scalability blocker.
-   [x] Identified `SpatialGrid.query` array allocation as a GC risk.
-   [x] Generated `performance_review.md` artifact.

### 2. Implementation
-   [x] **Tank Optimization**: Refactored `Tank.tsx` to merge 4 wall geometries into a single Mesh using `BufferGeometryUtils`.
-   [x] **Memory Optimization**: Refactored `SpatialGrid.ts` to add `queryCallback` for zero-allocation interaction. Updated `BoidsSystem.tsx` to use it.
-   [x] **Render Optimization**: Created `FishRenderSystem.tsx` implementing `InstancedMesh`.
-   [x] **Fish Component Refactor**: Stripped rendering logic from `Fish.tsx`, leaving only Physics<->ECS synchronization.

### 3. Verification & Fixes
-   [x] Verified application runs.
-   [x] Fixed "Giant Fish" issue by setting instance scale to `0.3`.
-   [x] Fixed runtime error `queryCallback is not a function` (caused by tool failure during execution).
-   [x] Backfilled documentation into Memory.

## Artifacts produced
-   `src/systems/FishRenderSystem.tsx`
-   Updates to `src/components/Tank.tsx`
-   Updates to `src/utils/SpatialGrid.ts`
-   Updates to `src/components/Fish.tsx`
