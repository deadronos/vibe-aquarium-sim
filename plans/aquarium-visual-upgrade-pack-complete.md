# Plan Complete: Aquarium Visual Upgrade Pack

This plan delivers a cohesive visual upgrade across the aquarium: projected procedural caustics, improved fish readability via subtle rim/SSS tint, upgraded water surface + volume shading, optional atmospheric particles and DOF postprocessing, and a clearer HUD. All features are gated by VisualQuality flags and backed by deterministic unit tests.

**Phases Completed:** 6 of 6

1. ✅ Phase 1: Quality Toggles + Plumbing
2. ✅ Phase 2: Procedural Caustics on Tank Walls/Floor
3. ✅ Phase 3: Fish Rim Lighting + Faux SSS Tint
4. ✅ Phase 4: Water Upgrade (Surface + Volume)
5. ✅ Phase 5: Atmosphere (Ambient Particles) + DOF Postprocessing
6. ✅ Phase 6: HUD Readability Pass

**All Files Created/Modified:**

- package.json
- package-lock.json
- src/App.tsx
- src/components/AmbientParticles.tsx
- src/components/PostProcessing.tsx
- src/components/Tank.tsx
- src/components/Water.tsx
- src/components/ui/HUD.tsx
- src/components/ui/HUD.css
- src/gameStore.ts
- src/performance/VisualQualityContext.ts
- src/performance/VisualQualityProvider.tsx
- src/performance/qualityPresets.ts
- src/shaders/causticsShader.ts
- src/shaders/fishLightingMaterial.ts
- src/shaders/waterShader.ts
- src/shaders/waterSurfaceShader.ts
- src/store.ts
- tests/AmbientParticles.test.tsx
- tests/HUD.test.tsx
- tests/PostProcessing.test.tsx
- tests/TankCausticsOverlay.test.tsx
- tests/VisualQualityContext.test.tsx
- tests/Water.test.tsx
- tests/adaptiveQuality.test.ts
- tests/fishLightingMaterial.test.tsx
- tests/setup.ts

**Key Functions/Modules Added:**

- VisualQualityProvider + useVisualQuality
- TankCausticsOverlay
- enhanceFishMaterialWithRimAndSSS
- Water surface shader + volume upgrade uniforms
- AmbientParticles
- PostProcessing (DOF)

**Test Coverage:**

- Total tests written/updated: multiple files across 6 phases
- All tests passing: ✅

**Recommendations for Next Steps:**

- Consider wiring DOF enablement to a UI toggle (stored in visualQualityOverrides) for quick A/B.
- If desired, add a small UI section exposing VisualQuality overrides for debugging/tuning.
