# Phase 5: Simulation-start transfer design

Date: 2026-09-03  
Issue: #145  
Branch: `codex/phase5-asset-transfer`

## Problem and goals

Starting a simulation currently loads all three fish GLBs through one Suspense boundary. The three public models are approximately 4.2 MB raw and are dominated by embedded PNG textures. The Vite chunk rules also classify generic Three.js paths before the more specific R3F/Drei and Rapier paths, so the intended dependency split is not reliable.

This phase will reduce simulation-start transfer while preserving the existing fish appearance and model-selection behavior. It will provide a repeatable asset pipeline, measurable before/after evidence, and regression gates for future changes.

## Scope and non-goals

In scope:

- dependency-aware Vite manual chunk classification;
- reproducible fish-asset optimization using Meshopt geometry compression and embedded WebP textures;
- moving source inputs outside the shipped `public/` tree and removing the unreferenced `CopilotClownFish.glb`;
- progressive loading of one critical fish model followed by deferred variants;
- transfer-size reporting and CI budget coverage;
- browser checks for model loading, fallback, visual continuity, and console/request health.

Out of scope:

- changing fish geometry, materials, animation, or gameplay behavior for aesthetic reasons;
- adding a KTX2/Basis runtime transcoder;
- redesigning the scene or renderer;
- changing save data or network protocols.

## Asset pipeline

`scripts/optimize-fish-assets.mjs` will be the single documented entry point. Pinned glTF Transform packages and their encoder configuration will be declared as development dependencies. The script will read source GLBs from a non-public source directory, apply Meshopt compression to mesh data, convert embedded PNG textures to WebP with an explicit quality setting, and write deterministic output GLBs to the paths consumed by `MODEL_URLS`.

The script will fail on missing inputs, unexpected model count, or an optimization error. It will print a per-file raw-byte comparison and total reduction. A separate report command will inspect `dist/` after build and record raw and gzip sizes for JavaScript chunks, each fish GLB, the total fish assets, and the critical first model. The checked-in performance documentation will contain the baseline and the measured post-optimization result; it will not rely on an unpinned online service.

## Runtime loading and data flow

`FishRenderSystem` will mount the primary model in the existing critical Suspense path. Variant model components will be nested beneath a non-blocking Suspense boundary so their requests begin after the primary scene can render. Until a variant is ready, entities using that model index render the primary model. Once loaded, the existing model index selects the variant without changing physics or ECS state.

The render loop will update each available fish ref independently rather than returning early when one variant ref is missing. A variant error boundary will retain the primary model and emit one diagnostic; a primary-model failure keeps the existing fatal/loading behavior. No render-loop code will allocate new vectors or other per-frame objects.

## Chunking

`manualChunks` will normalize path separators and match dependency-specific packages first: Rapier, R3F/Drei, Three.js, Miniplex, and Zustand. Generic substrings will not capture a more specific package. The production build output will be inspected to verify that the named chunks contain the intended dependencies and that GitHub Pages startup has no initialization-order errors.

## Validation and acceptance

- Unit tests cover chunk classification and model readiness/fallback behavior.
- `npm run format:check`, lint, typecheck, full unit tests, production build, and bundle checks pass.
- The asset report shows at least a 30% reduction in total fish-asset bytes from the recorded baseline; the critical model is reported separately.
- Playwright smoke tests run at desktop and short mobile viewports, verify a successful primary-model request/render, allow variants to settle, assert no failed fish requests or application console errors, and preserve existing WebGPU/fallback coverage.
- The final review records the exact tool/package versions, quality settings, byte measurements, and any visual differences.
