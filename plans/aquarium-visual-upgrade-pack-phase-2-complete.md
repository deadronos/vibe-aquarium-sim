# Phase 2 Complete: Procedural Caustics Overlay

Phase 2 adds a procedural, animated caustics overlay on the tank interior (walls + floor), quality-gated via `causticsEnabled` and implemented as a single merged overlay mesh for low draw-call overhead.

**Files created/changed:**

- src/components/Tank.tsx
- src/shaders/causticsShader.ts
- tests/TankCausticsOverlay.test.tsx

**Functions created/changed:**

- TankCausticsOverlay (exported)
- Tank (mounts TankCausticsOverlay)

**Tests created/changed:**

- TankCausticsOverlay - quality gating and uniform update behavior

**Review Status:** APPROVED

**Git Commit Message:**
feat: add procedural tank caustics overlay

- Add animated caustics shader for tank interior
- Render merged overlay mesh on walls and floor
- Gate overlay via visual quality flag with deterministic tests
