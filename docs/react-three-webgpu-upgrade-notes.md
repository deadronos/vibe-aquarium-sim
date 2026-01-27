React Three / Drei / WebGPU — Upgrade Watchlist

Date: 2026-01-26

Summary

This file lists five practical things to watch for when using the latest alpha/modern releases of @react-three/fiber, @react-three/drei and three's WebGPU support in this project. Keep these in the repo so maintainers can quickly find compatibility notes and mitigations.

1) WebGPU backend lifecycle and init safety
- drei and three now ship a dedicated WebGPU backend (three/webgpu) exposing WebGPURenderer that requires awaiting renderer.init() and a valid navigator.gpu/adapter. Watch for runtime adapter failures or rejected promises during init; implement robust fallbacks to WebGLRenderer and guard any code that calls WebGPU-specific APIs until init completes.
- Action: ensure supportsWebGPU checks adapter availability, catch init errors, and fall back to WebGL without crashing the app.

2) drei v11 split and new export surfaces
- drei is split into core/legacy/experimental/webgpu/native; many components/materials now have WebGPU-specific implementations (e.g., webgpu Mesh/TSL materials, Sparkles/Starfield webgpu variants). Imports that previously came from top-level drei may need to point at the appropriate subpath (or use the exported webgpu/legacy modules).
- Action: audit usages of special materials (MeshTransmission, MeshDistort, caustics, volumetrics) and prefer compatible variants or add runtime guards when running under the WebGPU backend.

3) @react-three/fiber v10 (alpha) API and Canvas/gl changes
- fiber v10 introduces a webgpu export surface and changes in how Canvas/gl can accept async gl initializers, event types/ThreeElements, and native vs web bindings. Tests and mocks (jest/vitest) that import Canvas/useFrame or mock r3f may need updates to reflect the new dist/exports or legacy surface.
- Action: check codepaths that rely on Canvas.gl prop, ThreeEvent typings, and any mocking helpers in tests; update tests to import the correct legacy or webgpu export when needed.

4) Bundling & module initialization fragility
- three.webgpu is large and contains new async init paths; splitting into many chunks can introduce evaluation-order issues (module initialization order) that cause subtle runtime errors. Project already keeps three in vendor chunk — keep manualChunks decisions, and test production builds for chunked init ordering problems.
- Action: preserve three (and critical r3f/drei parts) in vendor or single chunks that maintain evaluation order; run production build smoke tests verifying PMREM/PMREMGenerator and renderer.init flows.

5) TypeScript, peer-deps and color/renderer API changes
- three >=0.182 added color-management and new renderer properties (outputColorSpace, SRGB handling, PMREM async warnings); peerDeps require React 19 and matching three types. Type names and import paths (three/webgpu) are new so tsconfig, path aliases, and tests may need updates to avoid type errors referencing three/webgpu.
- Action: update tsconfig lib/paths if referencing three/webgpu types, ensure @types/three (or shipped types) match three version, and audit any usages of renderer.outputColorSpace, PMREMGenerator calls, and warnings about awaiting init.

Notes
- Do not downgrade packages; instead prefer guarded runtime checks and per-backend code paths. Keep the vendor/chunking strategy, update imports/tests where necessary, and add a small fallback path in renderer creation to avoid app crashes when adapter/init fails.

References
- Local node_modules: @react-three/fiber v10 alpha, @react-three/drei v11 alpha, three >=0.182 (webgpu build)
- Project Vite alias: three/webgpu -> node_modules/three/build/three.webgpu.js (vite.config.ts)
