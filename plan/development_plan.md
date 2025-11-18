# Vibe Aquarium Sim Development Plan

## Architecture
- **Engine**: React Three Fiber (R3F)
- **State Management / ECS**: Miniplex
- **Physics**: Rapier3D (@react-three/rapier)
- **Art Style**: Low Poly Procedural
- **AI**: Boids Flocking Algorithm

## Step-by-Step Implementation

### 1. Project Initialization
- Install dependencies: `three`, `@types/three`, `@react-three/fiber`, `@react-three/drei`, `miniplex`, `@react-three/rapier`.

### 2. Scene Setup
- Configure `App.tsx` with `<Canvas>`.
- Add Lighting (Ambient + Directional).
- Add `OrbitControls` for camera movement.

### 3. The Tank (Physics)
- Create a `Tank` component.
- Use Rapier `RigidBody` (Fixed) for walls/floor to contain physics objects (food).
- Visuals: Glass material for walls, sand material for floor.

### 4. ECS Architecture (Miniplex)
- Create `src/store.ts`.
- Define Entity types: `Fish`, `Food`.
- Components: `position`, `velocity`, `boid` (tag), `physics` (tag).

### 5. Procedural Fish Model
- Create `FishModel.tsx`.
- **Body**: `CapsuleGeometry`.
- **Tail**: Flattened `ConeGeometry`.
- **Fins**: Flattened `ConeGeometry` (smaller).
- **Eyes**: Small `SphereGeometry`.
- *Note*: Group these into a single component to represent one fish.

### 6. Boids System & AI
- Implement `useFrame` loop to update fish positions.
- Rules: Separation, Alignment, Cohesion.
- Constraint: Keep fish within tank bounds (soft force).

### 7. Interaction (Feeding)
- Click handler on the Tank floor/background.
- Spawn "Food" entity at click location (top of tank).
- Food has `RigidBody` (Dynamic) to fall.
- Fish AI update: If food exists, override flocking to seek food.
