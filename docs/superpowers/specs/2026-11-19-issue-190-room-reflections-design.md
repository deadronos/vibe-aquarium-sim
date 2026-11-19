# Real Room Reflections Design

**Intent:** Replace the tank's generic reflection-only Lightformers with the actual living room,
so glass and water visibly reflect the window, lamp, walls and furniture as the day changes.

## Goals

- Capture the room from the tank centre into one small cube render target.
- Exclude the aquarium's glass, water, fish and aquascape while capturing.
- Feed the same environment into glass, shiny furniture, and the custom water shader.
- Refresh only after at least five seconds and only when the smoothed daylight/lamp state changes
  meaningfully.

## Non-goals

- No planar or screen-space reflector, ray tracing, or real-time frame-by-frame cube rendering.
- No reflection of fish or moving bubbles; the captured source is intentionally room-only.
- No new textures or third-party dependencies.

## Approaches

1. **Planar MeshReflectorMaterial:** crisp in a selected plane but costs a full extra render every
   frame and does not provide a shared environment for glass and furniture.
2. **Additional dynamic Lightformers:** cheap, but continues to fake the room and cannot satisfy
   visible window/lamp reflections.
3. **Throttled real-room CubeCamera (selected):** one 128² six-face capture at start-up and after
   meaningful daylight changes, reused by all reflective materials.

## Architecture

- `RoomReflectionSchedule` in `src/scene/roomReflection.ts` records the last accepted daylight
  signature and enforces the five-second capture interval without per-frame allocation. It also
  exposes the preparation callback consumed by the base readiness pipeline.
- `RoomReflectionEnvironment` owns a `CubeCamera`, cube render target, disposal and the visibility
  swap for the named aquarium-exclusion group, plus an explicit `PMREMGenerator` output. The initial
  capture and environment-aware precompile complete before `setReady`.
- `Experience` groups tank-only renderers under that exclusion name while leaving the room and
  furniture visible to the cube camera.
- `scene.environment` receives the captured cube texture. The same texture is published through
  `waterUniforms` and sampled by `WaterSurface` with a softly distorted reflection vector.
- `Lights` retains actual lights and no longer mounts the `Environment`/`Lightformer` proxy scene.

## Acceptance

- Sofa and Up close views show the room window and lamp in the front-glass reflections.
- The same room reflection is visible through the custom water surface.
- Captures remain at least five seconds apart and remain on the same schedule when the time of day
  is stable.
- Unit, type, browser and bundle checks pass; Lite performance stays within normal A/B variance.
