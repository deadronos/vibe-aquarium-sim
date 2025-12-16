# TASK009: Code Quality Fixes

## Status
**Completed** (2025-12-16)

## Context
Code review identified 4 issues affecting correctness, maintainability, and performance:
1. Instance index collision causing rotation state corruption
2. Fragile system order wiping out water current forces
3. Unused physics helper leading to code duplication
4. Runtime allocation in render loop violating performance rules

## Sub-Tasks

### 1. Instance Index Collision (Critical) ✅
-   [x] Identified root cause: `entityToIndex.size` reuses indices unsafely
-   [x] Implemented monotonic counter + free-list recycling
-   [x] Updated cleanup logic to recycle removed entity indices

### 2. Fragile System Order ✅
-   [x] Identified issue: `externalForce.set(0,0,0).add()` wipes previous forces
-   [x] Changed to `.add()` only - forces accumulate correctly
-   [x] Consumer (`Fish.tsx`) clears `externalForce` after applying

### 3. Unused Helper ❌ NOT IMPLEMENTED
-   [x] Attempted refactor to use `applyQueuedForcesToRigidBody` helper
-   [x] Discovered impulse-based physics incompatible with velocity-based architecture
-   [x] Fish flew out of bounds and caused application hang
-   [x] **Decision**: Reverted - keep velocity-based approach (`setLinvel`) for stability

### 4. Render Loop Allocation ✅
-   [x] Identified `new Vector3()` inside `useFrame` for `targetVelocity`
-   [x] Verified `Spawner` already initializes `targetVelocity`
-   [x] Removed defensive allocation, use early exit instead

### 5. Verification ✅
-   [x] All 14 unit tests pass
-   [x] TypeScript build check passes
-   [x] Visual verification - fish behave normally, stay in tank

## Artifacts Modified
-   `src/systems/FishRenderSystem.tsx` - Index recycling
-   `src/systems/WaterResistanceSystem.tsx` - Force accumulation
-   `src/components/Fish.tsx` - Allocation removal only (no helper consolidation)
