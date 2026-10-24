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
- **Shaders compile before the veil lifts.** Once the fish mount, `precompile`
  (`src/scene/precompile.ts`) runs `renderer.compileAsync` (parallel where
  `KHR_parallel_shader_compile` exists) and only then marks the scene ready. Without
  `compileAsync` it compiles synchronously; a failure or a compile still running after 15 s
  lifts the veil anyway. The post stack loads later and compiles on its own.
- **Few lights, few programs.** One tank spot covers day and moonlight (colour and intensity
  follow `daylight`). Every extra light costs every lit fragment; every distinct material
  variant costs a program. Expect about 38 programs in Lite after boot (High adds the post stack).

## Quality modes

- **High**: DPR up to 1.5, `EffectComposer` (2x multisampling) with depth of field, bloom,
  vignette and AgX tone mapping. Depth of field runs every pass at half the composer's size
  (`HalfResDepthOfField` in `Effects.tsx`).
- **High without DoF** (`'medium'` in the store, `?quality=medium`): the same, minus depth of
  field. Only the performance monitor picks it; the HUD still shows it as High.
- **Lite**: DPR 1, no post-processing (the renderer applies AgX itself). The post-processing
  chunk is only requested above Lite.
- drei `PerformanceMonitor` steps one level at a time through `stepQuality` in the store:
  `onDecline` steps down, `onIncline` steps back up, never above the user's choice. It is
  remounted per level (samples at one level never count against another), ignored for
  `QUALITY_GRACE_MS` after any step or quality choice and again after the post stack mounts.
  Hysteresis: a step up waits `QUALITY_RECOVER_MS` after the first drop, twice as long after each
  further drop, and stops for good after `QUALITY_MAX_DROPS` drops until the next manual choice.
  Only reaching Lite shows "Switched to Lite for performance".
- A failed post-processing chunk download also drops to Lite. That failure stays inside the
  effects boundary, so the room keeps drawing. The browser keeps that failed URL, so the next
  switch to High loads the same file with a new query instead of repeating the rejected import.
  That retry imports the rewritten chunk from a `blob:` URL, so a future Content Security Policy
  must allow `blob:` in `script-src`.
- Every drop to Lite from the post stack shows a HUD notice. Only a failed download gets a new
  loader; a runtime error after the chunk loaded keeps the loaded module (a new loader would
  evaluate a second `postprocessing`). If the retry cannot work (no chunk URL, or the deployed
  `index.html` loads a different entry script after a new release), High is disabled and the
  notice offers Reload.
- `?quality=lite` in the URL starts in Lite (used by the smoke test: software GL on CI compiles
  the post-processing shaders very slowly). The default (High) path is a separate, shorter smoke
  test that only checks the lazy chunk arrives and the room stays up.

## Budgets

`npm run check:bundle` runs after `npm run build`. It enforces:

- Total JavaScript gzip (`MAX_JS_GZIP_BYTES`, default 600,000).
- First-paint JavaScript gzip (`MAX_FIRST_PAINT_JS_GZIP_BYTES`, default 570,000): the module
  script and `modulepreload` links in `dist/index.html`, counted once. The post-processing chunks
  are not in that set. Headroom over the current build is about 20%.
- Chunk layout, from `dist/.vite/chunk-manifest.json` (package names, not minified source): `three`,
  `react`, `r3f` and `postprocessing` do not contain each other's libraries, no two chunks import
  each other, and the post stack is not preloaded. A new output chunk has to be added to
  `CHUNK_PREFIXES` and `CHUNK_RULES` in `scripts/check-bundle-budget.mjs`, or the check reports
  it as unexpected.
- Fish-model byte budgets.

`npm run assets:optimize` simplifies each fish to 1,500 triangles before compressing it, and
`npm run assets:verify` fails if a shipped fish GLB goes over that.
