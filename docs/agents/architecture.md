# Architecture Guidelines

Vibe Aquarium Sim uses an Entity-Component-System (ECS) architecture combined with the Rapier physics engine.

## 🔄 The "Source of Truth" Loop

There is a critical bidirectional data flow between the ECS (Miniplex) and the Physics engine (Rapier):

1.  **ECS -> queued controls**: Systems (like `BoidsSystem`) calculate desired physics properties (velocity, forces, impulses) and queue those changes on the entity (for example, `steeringForce` or `externalForce`).
2.  **Before fixed physics step**: The `Fish` component's `useBeforePhysicsStep` callback consumes the queued controls and writes the target velocity to its `RigidBody` immediately before Rapier advances a fixed `1/60`-second step.
3.  **Physics update**: Rapier integrates the rigid bodies and resolves collisions. Its state is authoritative; ECS systems never call Rapier methods directly.
4.  **After fixed physics step**: The `Fish` component's `useAfterPhysicsStep` callback reads the authoritative translation and velocity, applies the tank boundary safety net, and mirrors the result into ECS vectors.
5.  **Render frame**: `useFrame` is reserved for render-rate visual work and opt-in diagnostics. It does not apply forces or read/write Rapier state, so trajectories do not depend on display refresh rate.

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
