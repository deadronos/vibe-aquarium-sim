# Phase 5 Complete: Ambient Particles + DOF Postprocessing

Phase 5 adds an atmospheric suspended-particles layer and an optional depth-of-field postprocessing pass. Both are quality-gated via VisualQuality flags, and tests cover the gating behavior deterministically.

**Files created/changed:**

- package.json
- package-lock.json
- src/App.tsx
- src/components/AmbientParticles.tsx
- src/components/PostProcessing.tsx
- tests/AmbientParticles.test.tsx
- tests/PostProcessing.test.tsx

**Functions created/changed:**

- AmbientParticles
- PostProcessing

**Tests created/changed:**

- AmbientParticles - mounts Points only when enabled
- PostProcessing - mounts EffectComposer/DepthOfField only when enabled (mocked)

**Review Status:** APPROVED (manual review; code-review-subagent returned 502)

**Git Commit Message:**
feat: add ambient particles and dof

- Add quality-gated ambient particle layers
- Add quality-gated DOF postprocessing composer
- Add deterministic tests for both features
