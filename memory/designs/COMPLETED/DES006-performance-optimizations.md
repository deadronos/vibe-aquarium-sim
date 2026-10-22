# DES006: Performance Optimizations

## Problem Statement

As the simulation scale increases (more fish, more complex environments), performance bottlenecks emerged in three key areas:

1.  **Rendering Overhead**: The Tank component used 4 separate `MeshTransmissionMaterial` instances for the glass walls. This material is computationally expensive (multi-pass refraction), causing high GPU load.
2.  **Draw Calls**: Each Fish was rendered as an individual GLTF object. With 30+ fish, this created 30+ draw calls (and significantly more with shadows). Scaling to 100s or 1000s of fish would hit CPU draw call limits.
3.  **Garbage Collection**: The `SpatialGrid` used for Boids neighbor detection allocated new Arrays for every query (N fish \* 60 FPS). This created significant GC pressure.

## Design Decisions

### 1. Merged Tank Geometry

Instead of 4 separate Render Objects for the Tank walls, we merged the geometries into a single mesh.

- **Implementation**: Used `BufferGeometryUtils.mergeGeometries` to combine the 4 wall BoxGeometries.
- **Benefit**: Reduces the scene graph depth and, crucially, allows the expensive Glass Shader to run on a single mesh (1 render pass for refraction instead of 4).

### 2. Fish Instancing System

Replaced individual `Fish.tsx` rendering with a centralized `FishRenderSystem`.

- **Architecture**:
  - `FishRenderSystem`: Loads the GLTF once. Manages a single `InstancedMesh`.
  - **Update Loop**: Iterates through ECS entities with `isFish` tag. Updates the `matrixAt(index)` of the InstancedMesh based on entity position and velocity.
  - **Scaling**: Set default scale to `0.3` to match intended visual size (since InstancedMesh uses raw geometry scale).
  - **Entity Mapping**: Currently uses implicit index (0..N) based on query order. For future robustness (adding/removing fish), a Map<EntityID, InstanceIndex> should be added.

  - **Adaptive Instance Updates (PoC)**: An opt-in PoC was added to reduce GL buffer update bursts under load by chunking instanceMatrix writes across frames. When enabled, the system marks per-instance matrices as "dirty" and flushes a budgeted number of writes per frame. When disabled (baseline), matrices are written directly every frame.

  **Bug (fixed 2026-01-14):** An implementation oversight left the baseline (PoC disabled) path without writing per-instance matrices in the hot loop — only the adaptive chunked flush path performed writes. This caused most instances to remain at the identity matrix and appear as a single overlapping fish. The fix writes instance matrices directly in the non-adaptive path and uses the dirty/chunked flush only when the PoC is enabled.

- **Benefit**: 1 Draw call for all fish. Capable of rendering thousands of instances.

### 3. Zero-Allocation Spatial Grid

Refactored `SpatialGrid.ts` to remove array allocations in the hot loop.

- **Change**: Deprecated `query(): T[]`. Added `queryCallback(pos, radius, cb: (item) => void)`.
- **Usage**: `BoidsSystem` now passes a lambda to `queryCallback`.
- **Benefit**: Eliminates per-frame array allocation for neighbor queries.

## Future Considerations

- **Fish Animation**: InstancedMesh does not support skeletal animation out of the box. Future improvements could look into Vertex Shader animation (VAT) for fish swimming motion.
- **Physics Batching**: Currently `Fish.tsx` still handles Physics<->ECS sync individually. This could be centralized into a `FishPhysicsSystem` for further CPU optimization.
