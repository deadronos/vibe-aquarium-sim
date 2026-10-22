# Performance

Target: 60 FPS on typical laptops with the High post stack, falling back to Lite rather than stuttering.

## Rules

- **No allocation in frame loops.** `useFrame` callbacks and `FishSchool.step` reuse
  module-level `Vector3`/`Quaternion`/`Matrix4`/`Euler` scratch objects and typed arrays.
  The daylight sample (`lightingAt`) is allocated at 5 Hz by design, never per frame.
- **Instancing for anything repeated**: fish (one `InstancedMesh` per species), food, plants,
  bubbles, books, leaves.
- **Animation on the GPU where possible**: plant sway, fish tail wave, water motes and light
  shafts are all shader-driven.
- **Shadows render on demand.** `gl.shadowMap.autoUpdate` is off; `Lights` sets `needsUpdate`
  for 2 frames at start-up and then only when the sun has moved. Only the room and furniture cast
  shadows. Tank contents don't.

## Quality modes

- **High**: DPR up to 1.75, `EffectComposer` with depth of field, bloom, vignette and AgX tone
  mapping.
- **Lite**: DPR 1, no post-processing (the renderer applies AgX itself).
- drei `PerformanceMonitor` drops to Lite automatically if the frame rate declines.
- `?quality=lite` in the URL starts in Lite (used by the smoke test: software GL on CI compiles
  the post-processing shaders very slowly).

## Budgets

`npm run check:bundle` enforces JS gzip and fish-model byte budgets after `npm run build`.
