# Feature Ideas for Vibe Aquarium Sim

Based on the analysis of the ECS architecture (Miniplex), Physics integration (Rapier), and Boids logic, here are 3 feature ideas that extend the simulation capabilities.

## 1. Predator Agent (The "Shark")

**Concept:** Introduce a larger "Predator" entity that actively patrols the tank, adding emergent behavior.

**Behavior:**

- **Prey (Fish):** Update `BoidsSystem` to include a "Flee" behavior. Fish will apply a strong steering force _away_ from any entity tagged `isPredator` within a certain radius.
- **Predator:** The predator seeks the "Center of Mass" of nearby fish clusters (Cohesion) but moves slower than the individual fish burst speed.

**Technical Implementation:**

- **ECS:** Add `isPredator` tag to `Entity` in `src/store.ts`.
- **Component:** Create `src/components/Shark.tsx`. Can reuse the existing `CopilotClownFish.glb` scaled 2x with a tinted material (e.g., grey/red) or import a new asset.
- **System:** Update `BoidsSystem.tsx` to:
  - Iterate over predators separately or include them in the spatial grid.
  - Calculate `flee` force for fish when near a predator.
  - Calculate `seek` force for predator towards fish.

## 2. Interactive Feeding System

**Concept:** Allow users to interact with the simulation by clicking to drop "Food Pellets", which fish will swarm to eat.

**Behavior:**

- **Physics:** Food pellets are small rigid bodies affected by gravity and water drag.
- **Fish:** Fish break their standard schooling formation to "Seek" the nearest food pellet (a new steering force with high priority/weight).
- **Consumption:** When a fish gets close enough to a food entity (e.g., < 0.1 units), the food entity is removed (eaten).

**Technical Implementation:**

- **ECS:** Add `isFood` tag to `Entity`.
- **Component:** Create `src/components/Food.tsx` (simple Sphere mesh + small `RigidBody`).
- **Input:** Add a click handler in `App.tsx` (using `useThree` raycaster) to spawn a Food entity at the cursor's world position (with a small random offset).
- **System:** Update `BoidsSystem` (or create `FeedingSystem.tsx`) to query `isFood` entities and apply attraction forces to nearby fish.

## 3. Environmental Obstacles & Avoidance

**Concept:** Add static objects (Rocks, Coral, Ruins) that fish actively avoid, improving the realism of the navigation.

**Behavior:**

- Currently, fish only avoid the "Tank Walls" (simulation bounds).
- Adding complex static geometry requires fish to "steer" around them rather than just colliding and bouncing physically (which looks unnatural for fish).

**Technical Implementation:**

- **ECS:** Add `isObstacle` tag to `Entity`.
- **Component:** Create `src/components/Obstacle.tsx` using `RigidBody type="fixed"` and a `mesh` (e.g., low-poly rock or procedural shape).
- **System:** Update `BoidsSystem` to include an "Obstacle Avoidance" rule.
  - Use raycasting (via Rapier `world.castRay`) or simple sphere-sphere checks ahead of the fish's velocity vector.
  - Apply a lateral steering force to guide the fish away before a collision occurs.
