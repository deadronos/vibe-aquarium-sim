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
- A failed post-processing chunk download also drops to Lite. That failure stays inside the
  effects boundary, so the room keeps drawing. The browser keeps that failed URL, so the next
  switch to High loads the same file with a new query instead of repeating the rejected import.
- `?quality=lite` in the URL starts in Lite (used by the smoke test: software GL on CI compiles
  the post-processing shaders very slowly). The default (High) path is a separate, shorter smoke
  test that only checks the lazy chunk arrives and the room stays up.

## Budgets

`npm run check:bundle` runs after `npm run build`. It enforces:

- Total JavaScript gzip (`MAX_JS_GZIP_BYTES`, default 600,000).
- First-paint JavaScript gzip (`MAX_FIRST_PAINT_JS_GZIP_BYTES`, default 570,000): the module
  script and `modulepreload` links in `dist/index.html`, counted once. The post-processing chunks
  are not in that set. Headroom over the current build is about 20%.
- Chunk layout, from `dist/chunk-manifest.json` (package names, not minified source): `three`,
  `react`, `r3f` and `postprocessing` do not contain each other's libraries, no two chunks import
  each other, and the post stack is not preloaded. A new output chunk has to be added to
  `CHUNK_PREFIXES` and `CHUNK_RULES` in `scripts/check-bundle-budget.mjs`, or the check reports
  it as unexpected.
- Fish-model byte budgets.

`npm run assets:optimize` simplifies each fish to 1,500 triangles before compressing it, and
`npm run assets:verify` fails if a shipped fish GLB goes over that.
