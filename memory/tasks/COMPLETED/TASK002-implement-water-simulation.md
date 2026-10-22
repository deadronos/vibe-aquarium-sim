# [TASK002] - Implement Water Simulation (Hybrid Approach)

**Status:** Pending  
**Added:** 2025-12-09  
**Updated:** 2025-12-09  
**Related Design:** [DES002] Water Simulation (Hybrid Approach)

## Original Request

Implement a hybrid water simulation system for the aquarium that combines visual shader effects with physics-based resistance, following the three-phase approach outlined in DES002.

## Thought Process

The implementation should follow a phased approach to ensure each component works independently before integration:

1. **Phase 1 First**: Visual water is the foundation - it provides immediate visual feedback and has no dependencies on other systems
2. **Phase 2 Next**: Physics resistance builds on the existing ECS architecture and Rapier integration
3. **Phase 3 Later**: Velocity field is optional and can be deferred based on performance and aesthetic needs

Each phase should be fully tested before moving to the next. This allows us to:

- Validate the visual approach before committing to physics changes
- Test performance impact incrementally
- Gather feedback on water aesthetics early
- Maintain a working state at each milestone

The critical technical constraints are:

- Zero allocations in render loops (use module-level temp vectors)
- Maintain 60 FPS with 100 fish
- Respect physics as source of truth (forces only, no position manipulation)
- Proper transparency rendering order

## Implementation Plan

### Phase 1: Visual Water Mesh with Shaders

#### 1.1 Create Water Shader

- Create `src/shaders/waterShader.ts` with GLSL code
- Implement vertex shader (basic transform + UV pass-through)
- Implement fragment shader with:
  - Depth-based color gradient
  - Caustics pattern (animated simplex/Perlin noise)
  - Fresnel transparency effect
  - Time-based animation uniforms

#### 1.2 Create Water Component

- Create `src/components/Water.tsx`
- Add box geometry matching tank interior (3.976m × 1.988m × 1.976m)
- Integrate custom ShaderMaterial
- Configure uniforms (waterColor, opacity, causticsScale, causticsSpeed)
- Add `useFrame` hook to update time uniform
- Ensure proper render order for transparency

#### 1.3 Integration and Testing

- Add Water component to scene (App.tsx or Tank.tsx)
- Test transparency rendering with glass walls
- Verify no z-fighting issues
- Performance test with fish
- Visual QA for caustics and color gradient

### Phase 2: Water Resistance Physics System

#### 2.1 Create Configuration

- Create `src/config/waterPhysics.ts`
- Define constants: density, dragCoefficient, crossSectionArea
- Add JSDoc comments explaining each parameter

#### 2.2 Update Entity Type

- Modify `src/store.ts` if needed
- Ensure Entity type supports rigidBody reference
- Add any water-specific component tags if needed

#### 2.3 Create Water Resistance System

- Create `src/systems/WaterResistanceSystem.tsx`
- Define module-level temp vectors (zero allocations)
- Implement `useFrame` loop:
  - Query entities with `world.with('isFish', 'velocity')`
  - Calculate drag force: F = -0.5 × ρ × C_d × A × v²
  - Apply force via `rigidBody.addForce(tempDragForce, true)`
- Add performance monitoring hooks

#### 2.4 Integration and Testing

- Add WaterResistanceSystem to App.tsx
- Test with single fish (verify deceleration)
- Test with 100 fish (verify 60 FPS)
- Tune coefficients for realistic underwater feel
- Verify no object allocations in loops (Chrome DevTools)

### Phase 3: Velocity Field (Optional - Future)

#### 3.1 Design Velocity Grid

- Create `src/utils/velocityField.ts`
- Define VelocityGrid type and structure
- Determine grid resolution (8×8×8 starting point)
- Implement grid initialization covering tank bounds

#### 3.2 Implement Sampling

- Create trilinear interpolation function
- Convert world position to grid coordinates
- Sample 8 nearest cells and interpolate

#### 3.3 Create Current System

- Create `src/systems/WaterCurrentSystem.tsx`
- Generate procedural flow patterns (Perlin noise)
- Add time-based animation for organic movement
- Apply sampled velocity as additional force

#### 3.4 Testing and Optimization

- Test with various grid resolutions
- Performance benchmark (target: <5ms per frame)
- Visual debug mode to visualize currents
- Tune noise parameters for aesthetic appeal

---

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description                                   | Status    | Updated    | Notes                                                                 |
| --- | --------------------------------------------- | --------- | ---------- | --------------------------------------------------------------------- |
| 1.1 | Create water shader with caustics and effects | Completed | 2025-12-15 | Implemented in `src/shaders/waterShader.ts`                           |
| 1.2 | Create Water component                        | Completed | 2025-12-15 | `src/components/Water.tsx`                                            |
| 1.3 | Integrate and test visual water               | Completed | 2025-12-15 | Manual QA + perf checks                                               |
| 2.1 | Create waterPhysics configuration             | Completed | 2025-12-15 | `src/config/waterPhysics.ts`                                          |
| 2.2 | Update Entity type for rigidBody refs         | Completed | 2025-12-15 | `src/store.ts` updated                                                |
| 2.3 | Create WaterResistanceSystem                  | Completed | 2025-12-15 | `src/systems/WaterResistanceSystem.tsx`                               |
| 2.4 | Integrate and test resistance physics         | Completed | 2025-12-15 | `tests/WaterResistanceSystem.test.ts`                                 |
| 3.1 | Design velocity grid structure (Future)       | Completed | 2025-12-15 | Procedural currents implemented instead of grid (computeWaterCurrent) |
| 3.2 | Implement grid sampling (Future)              | N/A       | 2025-12-15 | Trilinear grid deferred; procedural currents used                     |
| 3.3 | Create WaterCurrentSystem (Future)            | Completed | 2025-12-15 | `src/systems/WaterCurrentSystem.tsx`                                  |
| 3.4 | Test and optimize currents (Future)           | Completed | 2025-12-15 | `tests/WaterCurrentSystem.test.ts`                                    |

---

## Progress Log

### 2025-12-15

- Implemented water shader and `Water.tsx` component for visual water
- Created `waterPhysics` config and `WaterResistanceSystem` to queue drag forces
- Added `WaterCurrentSystem` and procedural current computation in `src/utils/physicsHelpers.ts`
- Added unit tests for drag/current computations and systems
- Performance checks completed (basic manual QA)

---

## Acceptance Criteria

### Phase 1 (Visual)

- [ ] Water mesh renders inside tank bounds without clipping
- [ ] Caustics pattern is visible and animates smoothly
- [ ] Color gradient transitions from light at top to dark at bottom
- [ ] Fresnel effect visible on edges
- [ ] Transparency blends correctly with glass walls
- [ ] No z-fighting or flickering
- [ ] Maintains 60 FPS with fish present

### Phase 2 (Physics)

- [ ] Fast-moving fish experience noticeable drag
- [ ] Stationary fish remain stationary (no spurious forces)
- [ ] Drag force scales proportionally with velocity squared
- [ ] Multiple fish (50-100) maintain 60 FPS
- [ ] No object allocations in render loop (verified via profiler)
- [ ] Fish movement feels "underwater" (subjective QA)
- [ ] Configuration parameters are tunable and documented

### Phase 3 (Currents - Optional)

- [ ] Fish drift gradually with current patterns
- [ ] Currents animate organically over time
- [ ] Grid resolution is configurable
- [ ] Performance impact is <5ms per frame
- [ ] Debug visualization available for development
- [ ] Current strength is tunable

---

## Technical Constraints

1. **Zero Allocations in Loops**
   - All `Vector3` instances must be module-level
   - No `new` keyword inside `useFrame` callbacks
   - Reuse temp vectors with `.copy()` and `.set()`

2. **Performance Target**
   - 60 FPS minimum with 100 fish entities
   - Each system should complete in <2ms per frame
   - Total frame budget: ~16.6ms

3. **Physics Integration**
   - All movement via Rapier forces/impulses
   - Never directly modify `entity.position`
   - RigidBody is the source of truth

4. **Rendering Order**
   - Water must render after opaque objects
   - Water must render before/after glass (test both)
   - Use `renderOrder` property if needed

---

## Dependencies

- Existing: `@react-three/fiber`, `@react-three/rapier`, `three`, `miniplex`
- No new dependencies required
- Uses built-in Three.js ShaderMaterial

---

## Risk Assessment

| Risk                             | Impact | Likelihood | Mitigation                                                  |
| -------------------------------- | ------ | ---------- | ----------------------------------------------------------- |
| Shader complexity impacts FPS    | High   | Medium     | Start simple, add effects incrementally, use LOD            |
| Transparency rendering issues    | Medium | High       | Test render order early, adjust material settings           |
| Drag forces feel wrong           | Medium | Medium     | Make coefficients configurable, gather feedback early       |
| Velocity field tanks performance | High   | Low        | Phase 3 is optional, implement only if Phases 1-2 succeed   |
| Vector allocation oversight      | High   | Low        | Use ESLint rules, manual code review, profiler verification |

---

## Next Steps

1. Review DES002 design document thoroughly
2. Examine existing shader examples in R3F ecosystem
3. Start implementation with subtask 1.1 (Create water shader)
4. Commit frequently with descriptive messages
5. Update this task file after each subtask completion

---

## References

- Design Document: [memory/designs/DES002-water-simulation-hybrid.md](memory/designs/DES002-water-simulation-hybrid.md)
- Existing Components: `src/components/Tank.tsx`, `src/components/Fish.tsx`
- Existing System: `src/systems/BoidsSystem.tsx`
- ECS Store: `src/store.ts`
