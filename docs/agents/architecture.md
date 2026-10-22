# Architecture

The app has two layers that only talk in one direction:

```
src/sim/     pure TypeScript: schooling, food, aquascape layout, time-of-day lighting model
   ▲ read
src/scene/   React Three Fiber: room, furniture, tank, fish rendering, camera, post-processing
src/ui/      DOM HUD driven by the zustand store in src/state/store.ts
```

## Simulation (`src/sim/`)

- `school.ts` — `FishSchool`, a struct-of-arrays boids school in **tank-local space**
  (origin at the centre of the inner tank floor). Wander + separation (all fish) +
  alignment/cohesion (same species) + soft walls, substrate, rocks and driftwood
  (`aquascape.ts` obstacles) + food seeking. It also smooths yaw/pitch/roll and the
  tail-beat phase, so the renderer only composes matrices.
- `food.ts` — fixed-capacity `FoodPool`: flakes float, sink in a spiral, settle on the
  sand and dissolve.
- `aquascape.ts` — rock, driftwood and plant layout shared by the renderer (geometry) and
  the school (obstacles).
- `timeOfDay.ts` — `lightingAt(hour)` returns sun direction/colour, sky colours, the
  evening lamp, the tank LED schedule (09:00–21:00), moonlight and fish activity.
- `random.ts` — seeded PRNG; all layouts and the sim are deterministic for a seed.

`src/scene/fish/simulation.ts` holds the single running school and food pool.
`FishView` steps them on a fixed 60 Hz clock.

## The daylight loop

`DaylightDriver` runs first each frame (`useFrame` priority −1). It works out the hour
(live clock, a 6-minute "day cycle", or the manual slider), samples `lightingAt` five times
a second, and eases the shared mutable `daylight` object (`src/scene/daylight.ts`) towards
it. Lights, the sky, the lamp shade, the tank LED and `waterUniforms` read `daylight` in their
own `useFrame`. Nothing re-renders through React for lighting changes.

## Under water

`makeUnderwater(material, options)` (`src/scene/tank/underwater.ts`) patches a built-in lit
material:

- **Absorption**: the fragment intersects the camera ray with the water box and blends towards
  the water colour per channel (red fades first). This is what makes the tank read as water.
- **Caustics** (opt-in): a cheap procedural pattern added on upward-facing surfaces, scaled by
  the tank LED.
- **Vertex deform** (opt-in): used for plant sway and the fish tail wave (`aSwim` instance
  attribute: phase, amplitude).

## Camera

`CameraRig` wraps drei `CameraControls`, bounded to the room. Viewpoints (Sofa, Tank, Up close,
Room) are `setLookAt` presets; "Follow a fish" re-targets every frame from outside the front
glass. The rig publishes a focus point that `Effects` uses for depth of field.
