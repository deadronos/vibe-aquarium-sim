# TASK008: Fix Abrupt Fish Turning with Instanced Rendering

## Status

**Completed** (2025-12-16)

## Context

After switching to instanced rendering in TASK007, fish began turning abruptly instead of smoothly. The previous per-fish component used `quaternion.slerp()` for smooth rotation transitions, but this was lost when consolidating to a single `InstancedMesh`.

## Root Cause

The `FishRenderSystem.tsx` was setting fish orientation directly from velocity without interpolation:

```typescript
tempQuat.setFromUnitVectors(FORWARD, tempVec);
tempObj.quaternion.copy(tempQuat); // Direct copy - no smoothing
```

Additionally, when velocity was near zero, the quaternion reset to identity, causing fish to snap to a default orientation.

## Sub-Tasks

### 1. Investigation

- [x] Analyzed `FishRenderSystem.tsx` useFrame loop
- [x] Compared with previous `Fish.tsx` implementation (commit `846e61e`)
- [x] Identified missing slerp interpolation as root cause

### 2. Implementation

- [x] Added `instanceQuaternions` Float32Array for per-instance rotation storage
- [x] Added `entityToIndex` Map for stable entity-to-instance mapping
- [x] Implemented slerp interpolation (0.1 factor per frame)
- [x] Fixed stationary fish to maintain last rotation instead of snapping to identity
- [x] Added entity cleanup logic for removed fish

### 3. Verification

- [x] TypeScript check passes
- [x] All 14 tests pass
- [x] Visual verification shows smooth turning behavior

## Artifacts Modified

- `src/systems/FishRenderSystem.tsx`
