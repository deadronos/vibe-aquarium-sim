# System Patterns

## Core architecture

- ECS (Miniplex) is the primary organization of simulation state; Systems operate on Entities and compose the simulation.
- The physics engine (Rapier) is the authoritative world-space integrator for position, velocity and collisions.

## Source-of-truth loop (guideline)

1. Systems (e.g. `BoidsSystem`) compute desired physics changes (velocity, impulses, forces) and _queue_ those changes on the ECS entity (for example `steeringForce` or `externalForce`).
   - Systems MUST NOT call Rapier methods directly (for example `applyImpulse`, `addForce`, `setLinvel`) — calling Rapier from inside systems or event callbacks can cause WASM re-entry and unsafe aliasing errors.
2. Rapier integrates the physics world and resolves collisions/contacts.
   - Components that own `RigidBody` wrappers (for example `Fish.tsx`) are responsible for applying queued forces/impulses to the `RigidBody` at a safe point (e.g. in `useFrame`), avoiding calling Rapier from systems or Rapier event callbacks.
3. Components (e.g. `Fish`) read the `RigidBody` state in `useFrame` and write the resulting transform back into ECS for rendering and UI.

## Key rules

- Physics is the imperative source of truth. Do not write to `entity.position` from Systems; use forces, impulses, and velocities instead.
- Avoid creating transient math objects inside `useFrame` loops — reuse module-level `Vector3` objects to minimize GC spikes.
- Prefer `for...of` iteration over arrays / `world.with(...)` queries in performance-critical systems.

## GPU / Shader Patterns

- **Infinite Particle Volumes**: For ambient particles (marine snow, dust), avoid CPU-side position updates or recycling logic.
  - Instead, use `mod(position + time * speed, volume)` in the vertex shader to wrap particles endlessly within a bounding box.
  - Pass simulation bounds as uniforms to the shader.
  - Use per-particle `seed` attributes for drift variation and offset to prevent rigid block movement.

## Bundling / runtime pattern

- Keep the initial app shell lightweight; load the full `Canvas` + `Physics` scene lazily.
- Rapier/physics-heavy code is gated behind the simulation start (or autostart) flow to reduce initial JS and defer WASM initialization.

## Files of interest

- `src/store.ts` — ECS world and entity definitions
- `src/systems/BoidsSystem.tsx` — example system using vector reuse and `useFrame`
- `src/components/Fish.tsx` — component that synchronizes Physics ↔ ECS in `useFrame`

## WebGPU / WebGL Material Branching

- Every component with custom materials must provide both a **GLSL `shaderMaterial`** (WebGL) and a **TSL node material** (WebGPU) variant. Branch on `useVisualQuality().isWebGPU`:

  ```tsx
  const { isWebGPU } = useVisualQuality();
  // ...
  {isWebGPU ? <SomeNodeMaterial ... /> : <shaderMaterial ... />}
  ```

- TSL node materials import from `three/webgpu` (e.g. `MeshBasicNodeMaterial`, `MeshPhysicalNodeMaterial`) and use `three/tsl` functions (`vec3`, `mix`, `time`, etc.).
- `onBeforeCompile` injection does **not** work on WebGPU — always skip material enhancement when `isWebGPU` is true.
- **Shadow map constraint**: On WebGPU, shadow map resolution is fixed at initial render. Never resize via `needsUpdate` — this crashes the WebGPU backend. The `AdaptiveQualityManager` enforces this automatically.

## Adaptive Quality System

- Visual quality is managed through a Zustand store (`useQualityStore`) with four preset levels: `low`, `medium`, `high`, `ultra`.
- Each preset controls: DPR, shadow map size (WebGL only), caustics, rim lighting, subsurface scattering, water surface/volume upgrades, ambient particles, and depth of field.
- `AdaptiveQualityManager` runs in `useFrame` and uses an EMA of FPS to degrade or upgrade quality based on performance. Downgrade is faster (2 stable low readings) than upgrade (4 stable high readings) with a cooldown period.
- `VisualQualityContext` provides flags like `isWebGPU` and feature toggles (`causticsEnabled`, etc.) to all descendant components.
- Debug: `window.__vibe_debug` gate controls per-frame debug sampling to avoid production overhead.
