# DES017 - Living-room rebuild architecture

**Status:** Completed (2026-10-22)

## Summary

v0.2.0 replaces the v0.1 architecture (Miniplex ECS, Rapier physics, worker-pool boids,
WebGL/WebGPU dual materials, four-level adaptive quality) with a smaller design: a pure
TypeScript simulation read by a thin React Three Fiber scene, set in a real-world-scale living
room.

## Decisions

- **No physics engine.** Fish are steered boids integrated directly in `FishSchool.step`.
  Collisions are soft steering (walls, sand, obstacle spheres) with a hard clamp as a safety net.
  This removed WASM start-up, worker transport code and the force-queue indirection.
- **Struct-of-arrays sim in tank-local space.** Positions, velocities, smoothed yaw/pitch/roll,
  tail-beat phase and effort live in typed arrays; the renderer only composes matrices.
- **One shared lighting model.** `lightingAt(hour)` is pure and tested; `DaylightDriver` eases
  a shared mutable state object that lights and materials read.
- **Water as a material patch, not a volume mesh.** `makeUnderwater` adds ray/box depth
  absorption (per-channel), caustics and vertex deformation to built-in lit materials.
- **WebGL only.** Built-in materials plus `onBeforeCompile`; no TSL branch to maintain.
- **Procedural assets.** Canvas textures and generated geometry; only the fish GLBs ship.
- **Two quality modes** (High/Lite) with drei `PerformanceMonitor`, instead of the bespoke
  four-level adaptive manager.

## Key values

- Room 6.4 × 5.2 × 2.7 m; tank 1.2 × 0.52 × 0.46 m, water level 0.46 m, on a 0.74 m sideboard.
- Species: clownfish ×10 (7.5 cm), blue tang ×4 (12 cm), angelfish ×5 (11 cm).
- Fixed sim step 1/60 s; food pool capacity 96; tank LED 09:00–21:00; day cycle 6 minutes.

## Files

- `src/sim/*`, `src/scene/*`, `src/config/scene.ts`, `docs/agents/architecture.md`
