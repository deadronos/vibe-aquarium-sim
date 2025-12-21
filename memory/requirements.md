# Requirements (EARS-style)

1. WHEN the simulation is started, THE SYSTEM SHALL create an ECS world and spawn a configurable number of fish entities.  
   Acceptance: `npm run dev` launches the app and the scene contains the configured number of fishes.

2. WHEN fish move, THE SYSTEM SHALL drive motion through Rapier rigid-body APIs (velocity, impulses), not by directly mutating entity positions.  
   Acceptance: Unit tests assert systems call Rapier APIs and `entity.position` is set only by reading physics state.

3. WHEN fish collide with world geometry, THE SYSTEM SHALL rely on Rapier to resolve collisions and update ECS state for rendering.  
   Acceptance: Integration test demonstrates two entities colliding and separating without overlapping after step resolution.

4. WHEN running the default scene, THE SYSTEM SHALL maintain a target of 60 FPS with 30 fish on a typical consumer laptop.  
   Acceptance: Manual performance test or CI profile shows median frame rate >= 60 for a short scenario.

5. WHEN users change runtime parameters via UI, THE SYSTEM SHALL apply changes without a full reload and keep simulation state consistent.  
   Acceptance: Controlled UI change updates runtime parameters and effects are visible without reloading the page.

6. WHEN a fixed-step simulation tick occurs, THE SYSTEM SHALL compute boid steering forces and water drag/current in a worker pool (multithreading) and apply results back to ECS within the next fixed-step update.  
   Acceptance: Boid/water math runs inside a worker function; the main thread only applies returned forces.

7. WHEN a worker job is still in flight, THE SYSTEM SHALL avoid launching overlapping simulation jobs and continue using the last applied forces.  
   Acceptance: System code gates new jobs while a previous job is pending.

8. WHEN a worker job fails, THE SYSTEM SHALL log the error and keep the simulation running with the last known forces.  
   Acceptance: Error handling logs failures without crashing the render loop.
