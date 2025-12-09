# Product Context

## Why this project exists

The project exists to provide a lightweight, extendable sandbox for experimenting with physics-driven, agent-based visual simulations. It focuses on combining predictable, high-quality physics (Rapier) with an ECS-driven design to make emergent behaviors easier to iterate on and visualize.

## Problems it solves

- Provides a small, performant environment for prototyping boids and soft physics interactions
- Makes it easy to iterate on systems and behaviors with a clear separation of concerns (ECS systems vs rendering components)

## How it should work

- Simulation logic is expressed as small, composable Systems that operate on Entities
- Rapier provides authoritative physics integration; simulation state is read back into the ECS for rendering and UI
- Systems are implemented as React components using `useFrame` for simplicity and composability

## User experience goals

- A calm, visually pleasing default scene with a handful of fishes moving naturally
- Gentle UI to tweak simulation parameters, spawn fish, or toggle debugging overlays
- Fast feedback loop for developers via `npm run dev` and a clean test & lint workflow
