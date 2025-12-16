# DES008: Code Quality Fixes - Index Collision, System Order, Allocation

## Problem Statement
A code review identified 4 issues affecting correctness and maintainability:

1. **Instance Index Collision** - `FishRenderSystem.tsx` used `entityToIndex.size` to assign instance indices, causing collisions when entities were removed and new ones added (rotation state corruption)
2. **Fragile System Order** - `WaterResistanceSystem` reset `externalForce` before adding drag, wiping out forces from other systems
3. **Unused Helper** - `Fish.tsx` duplicated force application logic instead of using `applyQueuedForcesToRigidBody`
4. **Render Loop Allocation** - `Fish.tsx` created `new Vector3()` inside `useFrame`

## Design Decisions

### 1. Instance Index Recycling (FishRenderSystem.tsx) ✅

```typescript
// Monotonic counter + free-list for stable index allocation
let nextIndex = 0;
const freeIndices: number[] = [];

// Assignment
idx = freeIndices.length > 0 ? freeIndices.pop()! : nextIndex++;

// Cleanup - recycle indices for reuse
freeIndices.push(removedIdx);
```

**Rationale**: Free-list recycling ensures indices are reused safely without collision, while monotonic counter prevents any index from being assigned twice while in use.

### 2. Force Accumulation Pattern (WaterResistanceSystem.tsx) ✅

```typescript
// Before: Reset + add (order-dependent)
externalForce.set(0, 0, 0).add(tempDragForce);

// After: Just add (forces accumulate)
externalForce.add(tempDragForce);
```

**Accumulation rule**: Systems ADD to `externalForce`. The consumer (`Fish.tsx`) clears it after applying.

### 3. Helper Consolidation ❌ NOT IMPLEMENTED

Attempted to refactor `Fish.tsx` to use `applyQueuedForcesToRigidBody` helper, but this caused physics instability:

- The helper uses **impulse-based** physics (`applyImpulse`)
- The existing architecture uses **velocity-based** physics (`setLinvel`)
- Switching caused fish to fly out of bounds and hang the application

**Decision**: Keep velocity-based approach for stability. The "code duplication" is intentional - different physics models require different implementations.

### 4. Render Loop Allocation (Fish.tsx) ✅

```typescript
// Before: Defensive allocation in useFrame
if (!targetVelocity) {
  targetVelocity = new Vector3();  // BAD: allocation in render loop
  world.addComponent(entity, 'targetVelocity', targetVelocity);
}

// After: Rely on Spawner initialization
const targetVelocity = entity.targetVelocity;
if (!targetVelocity) return;  // Early exit, no allocation
```

## Trade-offs

| Issue | Solution | Trade-off |
|-------|----------|-----------|
| Index collision | Free-list recycling | Small memory overhead for `freeIndices` array |
| System order | Accumulate-only pattern | Requires consumer to clear forces |
| Code duplication | **Not changed** | Velocity-based approach is stable |
| Allocation | Early exit if missing | Requires Spawner to initialize `targetVelocity` |

## Files Modified
- `src/systems/FishRenderSystem.tsx` - Index recycling
- `src/systems/WaterResistanceSystem.tsx` - Force accumulation
- `src/components/Fish.tsx` - Allocation removal only

## Lesson Learned
Velocity-based (`setLinvel`) and impulse-based (`applyImpulse`) physics are fundamentally different:
- `setLinvel()` SETS velocity directly - bounded, predictable
- `applyImpulse()` ADDS to velocity - can accumulate unboundedly

Do not mix these approaches without careful consideration of force clearing semantics.
