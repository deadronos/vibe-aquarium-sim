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
