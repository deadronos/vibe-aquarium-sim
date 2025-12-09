# Project Brief: Vibe Aquarium Sim

## Short description

Vibe Aquarium Sim is a lightweight, real-time, physics-driven aquarium simulation built with React, TypeScript, Three.js, and Rapier Physics. The simulation uses an Entity-Component-System (ECS) architecture (Miniplex) to model fish and environment systems so we can experiment with emergent behaviors, performant rendering, and physics-based interactions.

## Target audience

- Hobbyist developers and artists exploring agent-based visualizations and physics-driven motion
- Developers and researchers experimenting with fluid-like behaviors and GPU-friendly rendering patterns

## Primary goals

- Create a relaxing, visually appealing aquarium with believable fish behavior.
- Keep the simulation maintainable and easy to extend using ECS + small systems.
- Hit a consistent 60+ FPS on typical consumer hardware by minimizing GC and reusing math objects in render loops.

## Scope / Out of scope

In-scope:

- Modular systems for boids-style steering, collisions and basic environment interaction
- Rapier-based physics for reliable collision handling and integration of physical motion
- Clean developer DX with Vite, TypeScript, linting and unit tests

Out of scope (for now):

- Full GPU fluid simulation and large-scale performance tuning beyond prototyping

## Acceptance criteria (minimal)

- Repo includes a documented memory bank for project context and tasks.
- Simulation runs locally with `npm run dev` and demonstrates boids-based fish behavior.
- Code follows the project's performance patterns (no new object allocations in render loops).
