# Project Map

## 📂 Key Directories

- `src/systems/`: Simulation logic (Boids, WaterResistance, etc.). These should be lean and only update ECS data.
- `src/components/`: Visual and Physics representations. This is where React-Three-Fiber and Rapier `RigidBody` components live.
- `src/store.ts`: The "Source of Truth" for the ECS. Defines the `world` and `Entity` types.
- `src/shaders/`: Custom GLSL shaders (e.g., the water surface).
- `src/utils/`: Shared utilities and simulation helpers like `FixedStepScheduler`.

## 📍 Starting Points

- `src/store.ts`: Defines what data exists.
- `src/components/Fish.tsx`: The best example of ECS <-> Physics synchronization.
- `src/systems/BoidsSystem.tsx`: The best example of a complex logic loop with vector reuse.
