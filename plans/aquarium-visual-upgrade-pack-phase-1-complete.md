# Phase 1 Complete: Quality Toggles + Plumbing

Phase 1 adds visual-quality flags (with Low defaults) and wires them into the runtime via a provider/hook, without changing default visuals. Water now consumes the quality context to gate existing caustics intensity through a uniform.

**Files created/changed:**

- src/App.tsx
- src/components/Water.tsx
- src/gameStore.ts
- src/performance/qualityPresets.ts
- src/performance/VisualQualityContext.ts
- src/performance/VisualQualityProvider.tsx
- src/shaders/waterShader.ts
- tests/adaptiveQuality.test.ts
- tests/Water.test.tsx
- tests/VisualQualityContext.test.tsx

**Functions created/changed:**

- Visual quality types/flags (VisualQualityFlags)
- VisualQualityProvider
- useVisualQuality
- Water (caustics intensity gating)

**Tests created/changed:**

- VisualQualityContext - provider default and override semantics
- Adaptive quality presets - Low invariants (caustics + rim on; DOF off)
- Water - causticsIntensity uniform responds to quality

**Review Status:** APPROVED

**Git Commit Message:**
feat: add visual quality flag plumbing

- Add visual quality flags to presets and store
- Provide VisualQualityProvider and useVisualQuality hook
- Gate water caustics intensity via quality context and tests
