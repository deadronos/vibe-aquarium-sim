# System Patterns

See `docs/agents/architecture.md` for the full write-up; this is the short version.

## Core architecture

- **Simulation** (`src/sim/`) is plain TypeScript with no Three.js or React imports:
  `FishSchool` (struct-of-arrays boids), `FoodPool`, the aquascape layout, the time-of-day
  lighting model and a seeded PRNG. It is deterministic for a seed and fully unit-tested.
- **Scene** (`src/scene/`) is React Three Fiber. It reads the simulation every frame and never
  writes simulation state except through the sim's own methods (for example `food.sprinkle`).
- **UI** (`src/ui/`) is DOM, driven by the zustand store in `src/state/store.ts`.

## Frame loop

1. `DaylightDriver` (`useFrame` priority −1) computes the hour, samples `lightingAt` at 5 Hz and
   eases the shared mutable `daylight` object; it also updates the shared water uniforms.
2. `SimulationDriver` steps the school and food on a fixed 60 Hz clock (accumulator, capped
   catch-up) and answers feed/tap requests. `FishView` then writes instance matrices and the
   per-fish swim attribute from that shared state.
3. Lights, sky, lamp, tank LED and camera read shared state in their own `useFrame` callbacks.
   Lighting changes never go through React state.

## Key rules

- World units are metres; the floor is y = 0. Tank contents use tank-local space
  (`TANK_ORIGIN` in `src/config/scene.ts`).
- Zero allocation in frame loops and sim steps: reuse module-level scratch objects and typed
  arrays. The 5 Hz lighting sample is the one deliberate exception.
- Everything under water uses `makeUnderwater()` (depth absorption, optional caustics, optional
  vertex deform).
- Repeated objects are instanced; continuous motion (sway, tail wave, motes, shafts) is done in
  shaders.
- No new image assets: textures are generated on canvases at start-up (`src/scene/textures.ts`).

## Rendering

- WebGL only (`WebGLRenderer`). Custom looks come from `onBeforeCompile` patches of built-in
  materials, so lighting and shadows stay standard.
- Shadows render on demand: `gl.shadowMap.autoUpdate` is off; `Lights` re-renders them when the
  sun moves (and for 2 frames at start-up).
- Quality: High = DPR up to 1.5 plus post-processing (DoF, bloom, vignette, AgX); Medium keeps
  post-processing but drops depth of field; Lite = DPR 1 with no post-processing. drei
  `PerformanceMonitor` steps down within the manually selected ceiling; `?quality=lite` starts
  in Lite.
