# Plan: Aquarium Visual Upgrade Pack

Adds realism and readability via (1) projected procedural caustics, (2) subtle fish rim lighting + faux subsurface tint, (3) improved water surface specular/refraction plus volume shader upgrades, (4) ambient particles + quality-gated depth-of-field postprocessing, and (5) HUD readability tweaks. All changes are controlled through the existing adaptive quality/preset system; “Low” keeps caustics + fish rim enabled.

## Phases (6 phases)

1. **Phase 1: Quality Toggles + Plumbing**
   - **Objective:** Add feature flags/parameters for caustics, fish rim/SSS, water surface/volume quality, ambient particles, and postprocessing DOF; wire into the scene without changing visuals yet.
   - **Files/Functions to Modify/Create:**
     - src/performance/qualityPresets.ts (extend presets)
     - src/gameStore.ts (store shape/defaults)
     - src/App.tsx and/or scene-root component(s) (plumb settings)
   - **Tests to Write:**
     - Update/add Vitest coverage for the new preset fields and default values (existing adaptive-quality/preset test patterns).
   - **Steps:** Write failing tests → implement minimal store/preset wiring → re-run tests.

2. **Phase 2: Procedural Caustics on Tank Walls/Floor**
   - **Objective:** Render subtle animated caustics onto interior walls/floor using a lightweight overlay material with a shared time uniform (no new textures).
   - **Files/Functions to Modify/Create:**
     - src/components/Tank.tsx (overlay geometry + material)
     - src/shaders/* (caustics shader chunk/material helper)
   - **Tests to Write:**
     - Unit test asserting caustics uniforms exist and time uniform updates (similar to Water shader tests).
   - **Steps:** Write failing uniform/time test → implement overlays and uniform update → verify quality gating (enabled even in Low).

3. **Phase 3: Fish Rim Lighting + Faux SSS Tint (Subtle)**
   - **Objective:** Add subtle realism-first rim/fresnel highlight and faux subsurface/wrap lighting to fish materials used by instanced meshes.
   - **Files/Functions to Modify/Create:**
     - src/systems/FishRenderSystem.tsx (material cloning + onBeforeCompile injection)
     - Optional shared shader snippet utility under src/shaders/
   - **Tests to Write:**
     - Unit test confirming materials are cloned once and shader injection markers exist.
   - **Steps:** Write failing shader-injection test → implement guarded injection for single/array materials → keep enabled in Low.

4. **Phase 4: Water Upgrade (Surface + Volume)**
   - **Objective:** Improve “liquid” feel by adding a dedicated water surface layer (specular glints/refraction feel) and upgrading the existing volume water shader where appropriate.
   - **Files/Functions to Modify/Create:**
     - src/components/Water.tsx (add surface component, wire time/uniforms)
     - src/shaders/waterShader.ts (volume shader improvements)
   - **Tests to Write:**
     - Extend Water shader tests to cover new uniforms and feature gating (no pixel assertions).
   - **Steps:** Write failing tests for new uniforms/surface presence → implement surface + volume upgrades → verify transparency ordering stability.

5. **Phase 5: Atmosphere (Ambient Particles) + DOF Postprocessing**
   - **Objective:** Add near/far ambient particulate layers with parallax; add depth-of-field via postprocessing, strictly quality-gated.
   - **Files/Functions to Modify/Create:**
     - src/components/* or src/systems/EffectsSystem.tsx (ambient particles)
     - src/App.tsx or scene root (EffectComposer wiring)
     - package.json (add dependencies if not present)
   - **Tests to Write:**
     - Ambient particles: unit test asserting stable config/count per quality preset.
     - DOF: unit test asserting the composer mounts only when enabled.
   - **Steps:** Implement particles first → introduce postprocessing + DOF behind quality flags → confirm defaults are conservative.

6. **Phase 6: HUD Readability Pass**
   - **Objective:** Improve instruction readability with stronger panel contrast/typography and `prefers-contrast` support.
   - **Files/Functions to Modify/Create:**
     - src/App.tsx (HUD markup/toggle if needed)
     - src/index.css (panel styling)
   - **Tests to Write:**
     - DOM-level test asserting the HUD applies the expected classes/toggle behavior.
   - **Steps:** Write failing DOM test → implement CSS/markup changes → re-run tests.

## Decisions locked in

- Caustics are procedural (no new textures/assets).
- Add postprocessing for DOF (quality gated).
- Water includes both a surface layer and volume shader upgrades.
- Fish rim/SSS is subtle realism-first.
- “Low” keeps caustics + fish rim enabled.
