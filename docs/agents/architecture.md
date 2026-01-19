# Architecture Guidelines

Vibe Aquarium Sim uses an Entity-Component-System (ECS) architecture combined with the Rapier physics engine.

## 🔄 The "Source of Truth" Loop

There is a critical bidirectional data flow between the ECS (Miniplex) and the Physics engine (Rapier):

1.  **ECS -> Physics**: Systems (like `BoidsSystem`) calculate desired physics properties (velocity, forces, impulses) based on behaviors and queue those changes on the entity (e.g., `steeringForce` or `externalForce`).
2.  **Physics Update**: The `Fish` component applies queued entity properties to the `RigidBody` (e.g., `setLinvel`, `applyImpulse`) at a safe point in the frame.
3.  **Physics -> ECS**: Inside `Fish.tsx`'s `useFrame`, we read the _actual_ state from the `RigidBody` (which accounts for collisions) and write it back to the ECS entity.

> [!IMPORTANT]
> **Golden Rule**: Physics is the imperative source of truth for ALL entities.
>
> - Never manually update `entity.position` in Systems.
> - Systems MUST NOT call Rapier methods (e.g., `applyImpulse`, `addForce`, `setLinvel`) directly. Doing so risks WASM re-entrancy and unsafe aliasing errors.
> - Queue forces/impulses on the ECS entity instead.

## 🧩 Entity Component System (Miniplex)

- **Store**: Defined in `src/store.ts`. `world` is the raw Miniplex world; `ECS` is the React binding.
- **Entities**: Plain JS objects typed as `Entity`.
- **Systems**: Implemented as React components (e.g., `src/systems/BoidsSystem.tsx`) that run logic inside `useFrame`.
- **Queries**: Use `world.with('tag', ...)` to query entities in loops.

## 🖥️ UI State

We plan to use **Zustand** for UI state management. For now, keep UI state separate from the ECS simulation state where possible.
