# DES007: Per-Instance Rotation Interpolation for Instanced Fish

## Problem Statement
After implementing fish instancing (DES006), fish turned abruptly when changing direction. The original per-fish component had smooth rotation transitions via `quaternion.slerp()`, but InstancedMesh shares a single Object3D for matrix generation, making it impossible to interpolate per-fish without additional state storage.

## Design Decision

### Per-Instance Rotation State
Store quaternion state externally for each fish instance:

```typescript
// Float32Array: [x, y, z, w] per instance
const instanceQuaternions = new Float32Array(MAX_INSTANCES * 4);
// Initialize to identity (0, 0, 0, 1)
for (let i = 0; i < MAX_INSTANCES; i++) {
    instanceQuaternions[i * 4 + 3] = 1;
}
```

### Stable Entity-to-Index Mapping
Use a Map to ensure each entity maintains its rotation history across frames:

```typescript
const entityToIndex = new Map<Entity, number>();
```

This prevents rotation state from being "swapped" between fish if ECS query order changes.

### Slerp Interpolation
Each frame, load previous quaternion, slerp towards target, and store back:

```typescript
prevQuat.set(instanceQuaternions[base], ...);
prevQuat.slerp(tempQuat, 0.1);  // 10% per frame
instanceQuaternions[base] = prevQuat.x;
// ...
```

The 0.1 factor matches the original Fish.tsx implementation.

### Stationary Fish Handling
When velocity is near-zero, fish maintain their last rotation instead of snapping to identity quaternion.

## Trade-offs
| Approach | Pros | Cons |
|----------|------|------|
| **Store in ECS** | Cleaner data model | Adds component overhead to every fish |
| **External Float32Array** (chosen) | Zero ECS overhead, fast typed array access | Requires manual entity-index mapping |
| **No interpolation** | Simplest | Abrupt turning (original bug) |

## Future Considerations
-   Could move rotation state into ECS as a `visualRotation` component for better encapsulation
-   Could make slerp factor frame-rate independent using delta time
