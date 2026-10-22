# Project Brief: Vibe Aquarium Sim

## Short description

Vibe Aquarium is a cozy living-room aquarium you can sit and watch in the browser. A planted,
rimless tank sits on a sideboard in a small living room that follows the time of day. A school
of clownfish, blue tangs and angelfish swims inside. It is built with React, TypeScript, Three.js
and React Three Fiber.

## Target audience

- People who want a calm, ambient "aquarium in the room" to leave open on a screen.
- Developers and artists exploring procedural 3D scenes, boids behaviour and lightweight shading
  tricks in React Three Fiber.

## Primary goals

- A believable, relaxing scene: the tank reads as part of a real room at real-world scale.
- Natural-looking fish behaviour (schooling, feeding, day/night rhythm).
- 60 FPS on typical consumer laptops, with an automatic Lite mode for weaker devices.
- A small, maintainable codebase: plain-TypeScript simulation plus a thin rendering layer.

## Scope

In scope:

- Procedural room, furniture and aquascape (no downloaded textures or room models).
- Boids school with food seeking, obstacle avoidance and day/night activity.
- Time of day from the local clock, a fast day cycle, or a manual slider.
- Viewpoints, feeding interaction, ambient audio, quality modes.

Out of scope (for now):

- Physics engines, fluid simulation, WebGPU-specific rendering paths.
- Authored room models (a Blender-baked room is a possible future upgrade, see `activeContext.md`).

## Acceptance criteria (minimal)

- `npm run dev` shows the living room with the tank and a schooling, feedable fish population.
- Unit tests cover the simulation (`src/sim/`); a Playwright smoke test boots the production build.
- Frame loops follow the zero-allocation rule (see `systemPatterns.md`).
