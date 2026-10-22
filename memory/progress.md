# Progress

## What works (v0.2.0, living-room rebuild)

- Living room at real-world scale with a time-of-day sky, sunlight and shadows, evening lamp,
  procedural furniture and textures.
- Planted rimless tank: sloped sand, rocks, driftwood, swaying plants, LED fixture, bubbles,
  light shafts, motes, water absorption and caustics.
- Boids school (19 fish, 3 species) with feeding, obstacle avoidance and day/night activity.
- Clock modes (live, 6-minute cycle, manual), five viewpoints, ambient audio, High/Lite quality.
- 22 unit tests for the simulation, a Playwright smoke test, and the bundle budget check in CI.

## What's left / next milestones

1. Visual verification on real low-end devices and phones (touch controls, HUD layout).
2. Optional: a Blender-baked room (lightmaps) replacing procedural furniture.
3. Life around the tank (for example a cat at the glass), tap-the-glass startle, more species.

## Known issues / technical debt

- From the Sofa viewpoint the sofa itself is barely in frame.
- The follow camera can look along the side glass when its fish swims near the edge.
- While the HUD is auto-hidden, clicks land on the scene until the pointer moves.

## History

### 2026-10-22: v0.2.0 rebuild (PR #167)

- Replaced the ECS + Rapier + worker + WebGPU architecture with the current sim/scene split
  (DES017, TASK019). Old designs and tasks were moved to the `COMPLETED/` archives.

### 2026-10-23: docs audit (TASK020)

- Rewrote the memory bank core files for the new architecture and archived v0.1-era docs, plans
  and specs under `docs/archive/v0.1/`.
- Found and fixed the Pages boot check, which still grepped the old smoke-test title (PR #168).

### Before 2026-10

- See `memory/tasks/COMPLETED/` and `memory/designs/COMPLETED/` for the v0.1 history (Rapier
  physics, ECS, worker offload, adaptive quality, WebGPU parity).
