# Plan: Fluid Simulation & Physics Overhaul

We will implement a "Tier 1" fluid simulation using `@react-three/drei` for realistic water visuals and `@react-three/rapier` for physical effects (buoyancy and drag). We will also overhaul the Fish entities to be fully physics-driven with procedural animations, moving away from direct velocity manipulation to force-based steering.

**Phases**

1. **Phase 1: Water Component & Visuals**
   - **Objective:** Create the `Water` component with `MeshTransmissionMaterial` and a sensor collider, sized to fit the tank.
   - **Files/Functions to Modify/Create:**
     - `src/components/Water.tsx` (create)
     - `src/components/Tank.tsx` (modify)
     - `src/App.tsx` (modify)
   - **Tests to Write:**
     - `Water.test.tsx`: Verify component renders and collider is present (if testing setup exists, otherwise manual verification).
   - **Steps:**
     1. Create `src/components/Water.tsx`.
     2. Implement the visual mesh using `MeshTransmissionMaterial` with size `[10, 5, 6]` and position `[0, -0.5, 0]`.
     3. Add a `CuboidCollider` (sensor) with the same dimensions.
     4. Modify `src/components/Tank.tsx` to remove the old water surface.
     5. Add `<Water />` to `src/App.tsx`.

2. **Phase 2: Water Physics (Buoyancy & Drag)**
   - **Objective:** Implement the physics loop in the Water component to apply forces to submerged objects.
   - **Files/Functions to Modify/Create:**
     - `src/components/Water.tsx` (modify)
   - **Tests to Write:**
     - No unit tests for physics loop (requires integration test), manual verification with debug objects.
   - **Steps:**
     1. Track submerged RigidBodies using `onIntersectionEnter/Exit`.
     2. In `useFrame`, apply:
        - **Buoyancy:** Upward force to counteract gravity (make things float).
        - **Drag:** Force opposite to velocity ($F = -k \cdot v$) to simulate viscosity.
     3. Verify with a test object (e.g., a simple cube) if possible, or wait for Fish update.

3. **Phase 3: Physics-Based Boids**
   - **Objective:** Refactor the Boids system to apply **forces** instead of setting velocity directly, allowing the water physics to influence movement.
   - **Files/Functions to Modify/Create:**
     - `src/store.ts` (modify Entity type)
     - `src/systems/BoidsSystem.tsx` (modify logic)
     - `src/components/Fish.tsx` (modify physics update)
   - **Tests to Write:**
     - `BoidsSystem.test.tsx`: Verify forces are calculated instead of velocity.
   - **Steps:**
     1. Update `Entity` type in `store.ts` to include `steeringForce: Vector3`.
     2. Refactor `BoidsSystem.tsx`:
        - Calculate steering forces (separation, alignment, cohesion, seeking).
        - Instead of modifying `velocity` directly, accumulate these into `steeringForce`.
        - Remove manual velocity clamping (drag will handle max speed).
     3. Refactor `Fish.tsx`:
        - Remove `setLinvel`.
        - Use `rigidBody.current.applyImpulse(entity.steeringForce)` in `useFrame`.
        - Ensure `gravityScale` is set to `1` so buoyancy is required to float.

4. **Phase 4: Procedural Swimming Animation**
   - **Objective:** Animate the fish tail based on swimming speed.
   - **Files/Functions to Modify/Create:**
     - `src/components/FishModel.tsx` (modify)
     - `src/components/Fish.tsx` (modify)
   - **Tests to Write:**
     - None (visual verification).
   - **Steps:**
     1. Modify `FishModel.tsx` to accept a `speed` prop.
     2. Use `useFrame` in `FishModel` to oscillate the tail mesh rotation: `rotation.y = sin(time * speed)`.
     3. Pass the entity's actual velocity magnitude as `speed` from `Fish.tsx`.

**Open Questions**

1. None.

