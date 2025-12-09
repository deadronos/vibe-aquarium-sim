# System Patterns

## Core architecture

- ECS (Miniplex) is the primary organization of simulation state; Systems operate on Entities and compose the simulation.
- The physics engine (Rapier) is the authoritative world-space integrator for position, velocity and collisions.

## Source-of-truth loop (guideline)

1. Systems (e.g. `BoidsSystem`) compute desired physics changes (velocity, impulses, forces) and *queue* those changes on the ECS entity (for example `steeringForce` or `externalForce`).
	- Systems MUST NOT call Rapier methods directly (for example `applyImpulse`, `addForce`, `setLinvel`) — calling Rapier from inside systems or event callbacks can cause WASM re-entry and unsafe aliasing errors.
2. Rapier integrates the physics world and resolves collisions/contacts.
	- Components that own `RigidBody` wrappers (for example `Fish.tsx`) are responsible for applying queued forces/impulses to the `RigidBody` at a safe point (e.g. in `useFrame`), avoiding calling Rapier from systems or Rapier event callbacks.
3. Components (e.g. `Fish`) read the `RigidBody` state in `useFrame` and write the resulting transform back into ECS for rendering and UI.

## Key rules

- Physics is the imperative source of truth. Do not write to `entity.position` from Systems; use forces, impulses, and velocities instead.
- Avoid creating transient math objects inside `useFrame` loops — reuse module-level `Vector3` objects to minimize GC spikes.
- Prefer `for...of` iteration over arrays / `world.with(...)` queries in performance-critical systems.

## Files of interest

- `src/store.ts` — ECS world and entity definitions
- `src/systems/BoidsSystem.tsx` — example system using vector reuse and `useFrame`
- `src/components/Fish.tsx` — component that synchronizes Physics ↔ ECS in `useFrame`
