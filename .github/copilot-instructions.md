# Vibe Aquarium Sim - AI Coding Instructions

## Project Context

This is a **React 19** application using **TypeScript**, **Vite**, **Three.js (@react-three/fiber)**, **Rapier Physics (@react-three/rapier)**, and **Miniplex (ECS)**.

## Repository-level instructions

This repository includes additional process and memory-bank guidance for AI agents and contributors under `.github/instructions/`. Please consult the following before planning or making changes:

Memory bank is in `memory/` folder.

- `.github/instructions/memory-bank.instructions.md` — memory-bank conventions and where to store design/task artifacts.
- `.github/instructions/spec-driven-workflow-v1.instructions.md` — spec-driven workflow guidance for analyze → design → implement → validate → reflect → handoff.

## Architecture & Data Flow

The project combines an Entity-Component-System (ECS) architecture with a physics engine.

### 1. The "Source of Truth" Loop

There is a critical bidirectional data flow between the ECS (Miniplex) and the Physics engine (Rapier):

1.  **ECS -> Physics**: Systems (like `BoidsSystem`) calculate desired physics properties (velocity, forces, impulses) based on behaviors and queue those changes on the entity (for example `steeringForce` or `externalForce`).
2.  **Physics Update**: The `Fish` component applies queued entity properties to the `RigidBody` (e.g., `setLinvel`, `applyImpulse`) at a safe point.
3.  **Physics -> ECS**: Inside `Fish.tsx`'s `useFrame`, we read the _actual_ state from the `RigidBody` (which accounts for collisions) and write it back to the ECS entity.

**Rule**: Physics is the imperative source of truth for ALL entities. Never manually update `entity.position` in Systems. Systems MUST NOT call Rapier methods (for example `applyImpulse`, `addForce`, `setLinvel`) directly — calling Rapier from systems or Rapier event callbacks risks WASM re-entrancy and unsafe aliasing errors. Instead queue forces/impulses on the ECS entity and let the component that owns the `RigidBody` apply them in `useFrame`.

### 2. Entity Component System (Miniplex)

- **Store**: Defined in `src/store.ts`. `world` is the raw Miniplex world; `ECS` is the React binding.
- **Entities**: Plain JS objects typed as `Entity`.
- **Systems**: Implemented as React components (e.g., `src/systems/BoidsSystem.tsx`) that run logic inside `useFrame`.
- **Queries**: Use `world.with('tag', ...)` to query entities in loops.

### 3. UI State

- **Future**: We plan to use **Zustand** for UI state management. For now, keep UI state separate from the ECS simulation state where possible.

## Coding Conventions

### Prettier & ESLint

Read .prettierrc and eslint.config.js, follow the rules exactly. After making edits run npm run format and npm run lint --max-warnings=0. Don’t add unrelated changes; keep diffs minimal.

### Performance & Math

- **Vector Reuse**: In `useFrame` loops (especially in Systems), **never** create new `Vector3` instances. Create module-level temporary vectors to avoid Garbage Collection spikes.
  ```typescript
  // Good
  const tempVec = new Vector3()
  useFrame(() => {
    tempVec.copy(entity.position).add(...)
  })
  ```
- **Loops**: Simple `for...of` loops over `world.with(...)` are preferred for systems.

### React & Three.js

- **Components**: Functional components with Hooks.
- **R3F**: Use `@react-three/fiber` hooks (`useFrame`, `useThree`) for render-loop logic.
- **Rapier**: Use `RigidBody` for physical objects. Ensure colliders are configured correctly (e.g., `colliders="ball"`).

## Critical Files

- `src/store.ts`: ECS World and Entity type definitions.
- `src/systems/BoidsSystem.tsx`: Example of a logic system with vector reuse.
- `src/components/Fish.tsx`: Example of ECS <-> Physics synchronization.

## Developer Workflow

- **Start**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
