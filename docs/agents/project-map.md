# Project Map

## 📂 Key Directories

- `src/systems/`: Simulation logic (Boids, WaterResistance, etc.). These should be lean and only update ECS data.
- `src/components/`: Visual and Physics representations. This is where React-Three-Fiber and Rapier `RigidBody` components live.
- `src/components/materials/`: WebGPU-compatible node materials (`GlassNodeMaterial`, `WaterNodeMaterial`, etc.) using Three.js TSL. These are the WebGPU counterparts to the GLSL `shaderMaterial` variants used on WebGL.
- `src/performance/`: Adaptive quality management (`AdaptiveQualityManager`, `qualityPresets`, `qualityStore`, `VisualQualityContext`). Controls DPR scaling, shadow map sizing, and feature toggles based on FPS and device capability.
- `src/store.ts`: The "Source of Truth" for the ECS. Defines the `world` and `Entity` types.
- `src/shaders/`: Custom GLSL shaders (e.g., the water surface, caustics). Used only on WebGL; WebGPU uses TSL node materials instead.
- `src/utils/`: Shared utilities and simulation helpers like `FixedStepScheduler`, `rendererUtils`.

## 📍 Starting Points

- `src/store.ts`: Defines what data exists.
- `src/components/Fish.tsx`: The best example of ECS <-> Physics synchronization.
- `src/systems/BoidsSystem.tsx`: The best example of a complex logic loop with vector reuse.
- `src/performance/qualityPresets.ts`: Quality level definitions and their effect on rendering features.
- `src/components/materials/`: Example of the WebGPU/WebGL dual-material pattern.
