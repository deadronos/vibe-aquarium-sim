# Phase 3 Complete: Fish Rim Lighting + Faux SSS

Phase 3 adds subtle realism-first rim lighting and faux subsurface tint to fish materials via one-time `onBeforeCompile` shader injection. Feature toggles are driven by VisualQuality flags and applied by updating uniforms (no shader recompilation on toggle), and the FishRenderSystem hot path avoids per-frame allocations.

**Files created/changed:**

- src/store.ts
- src/systems/FishRenderSystem.tsx
- src/shaders/fishLightingMaterial.ts
- tests/fishLightingMaterial.test.tsx

**Functions created/changed:**

- enhanceFishMaterialWithRimAndSSS
- FishRenderSystem (quality-driven uniform updates + allocation-free bookkeeping)

**Tests created/changed:**

- fish lighting material injection - shader marker, clone/no-mutation, override-driven strength zeroing

**Review Status:** APPROVED

**Git Commit Message:**
feat: add fish rim and faux sss shading

- Inject rim and wrap-light tint via onBeforeCompile uniforms
- Toggle fish shading via visual quality flags without recompiles
- Avoid per-frame allocations with pooled quaternions and entity bookkeeping
