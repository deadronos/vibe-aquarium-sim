# Phase 4 Complete: Water Surface + Volume Upgrades

Phase 4 improves the water look by adding a dedicated, quality-gated surface shader for specular glints/fresnel shimmer and by upgrading the existing volume water shader behind upgrade uniforms. Tests verify surface gating, upgrade uniform gating, and deterministic time-uniform updates.

**Files created/changed:**

- src/components/Water.tsx
- src/shaders/waterShader.ts
- src/shaders/waterSurfaceShader.ts
- tests/Water.test.tsx

**Functions created/changed:**

- Water (surface mounting + upgrade uniform gating)
- waterFragmentShader (volume upgrade uniforms)
- waterSurface shaders

**Tests created/changed:**

- Water - surface mesh gating via overrides
- Water - volume upgrade uniform gating
- Water - deterministic time uniform update (mocked useFrame)

**Review Status:** APPROVED

**Git Commit Message:**
feat: upgrade water surface and volume shading

- Add quality-gated water surface shimmer shader
- Gate volume shader upgrades via uniforms
- Improve Water tests with deterministic frame control
