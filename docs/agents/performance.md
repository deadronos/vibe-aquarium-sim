# Performance

Target: 60 FPS at 1080p on integrated GPUs with the high-quality post stack.

## Rules

- **No allocation in frame loops.** `useFrame` callbacks and `FishSchool.step` reuse
  module-level `Vector3`/`Quaternion`/`Matrix4`/`Euler` scratch objects and typed arrays.
  The daylight sample (`lightingAt`) is allocated at 5 Hz by design, never per frame.
- **Instancing for anything repeated**: fish (one `InstancedMesh` per species), food, plants,
  bubbles, books, leaves.
- **Animation on the GPU where possible**: plant sway, fish tail wave, water motes and light
  shafts are all shader-driven.
- **Shadows render on demand.** `gl.shadowMap.autoUpdate` is off; `Lights` sets `needsUpdate`
  only when the sun has moved. Only the room and furniture cast shadows. Tank contents don't.

## Quality modes

- **High**: DPR up to 1.75, `EffectComposer` with depth of field, bloom, vignette and AgX tone
  mapping.
- **Lite**: DPR 1, no post-processing (the renderer applies AgX itself).
- drei `PerformanceMonitor` drops to Lite automatically if the frame rate declines.

## Budgets

`npm run check:bundle` enforces JS gzip and fish-model byte budgets after `npm run build`.
