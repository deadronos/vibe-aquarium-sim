import { Vector3 } from 'three';
import { world } from '../store';
import type { Entity } from '../store';
import { useEffect } from 'react';
import { fixedScheduler } from '../utils/FixedStepScheduler';
import { SpatialGrid } from '../utils/SpatialGrid';
import { triggerEatingBurst } from '../utils/effectsBus';
import { BOIDS_CONFIG, SIMULATION_BOUNDS } from '../config/constants';

// Temporary vectors to avoid GC in the loop
const sep = new Vector3();
const ali = new Vector3();
const coh = new Vector3();
const diff = new Vector3();
const steer = new Vector3();
const tempVec = new Vector3();

const { neighborDist, separationDist, maxSpeed, maxForce } = BOIDS_CONFIG;
const neighborDistSq = neighborDist * neighborDist;
const separationDistSq = separationDist * separationDist;

// 1.5 units cell size - slightly larger than standard neighbor distance to catch edge cases
const grid = new SpatialGrid<Entity>(neighborDist * 2.5);

// BoidsSystem computes `steeringForce` per entity and writes it into ECS.
// NOTE: Do NOT call Rapier directly from systems — leave Rapier RPCs to components.
const updateBoidsLogic = () => {
  // We only iterate over entities that have all the required components
  const boids = world.with('isBoid', 'position', 'velocity', 'steeringForce');

  // Rebuild grid
  grid.clear();
  for (const entity of boids) {
    if (entity.position) {
      grid.add(entity.position, entity);
    }
  }

  for (const entity of boids) {
    sep.set(0, 0, 0);
    ali.set(0, 0, 0);
    coh.set(0, 0, 0);

    let count = 0;

    // Radius query
    grid.queryCallback(entity.position, neighborDist, (neighbor: Entity) => {
      if (entity === neighbor) return;
      // We know these exist because of the ECS query, but TS needs help
      if (!neighbor.position || !entity.position) return;

      // OPTIMIZATION: Use distanceToSquared to avoid expensive Math.sqrt()
      const dSq = entity.position.distanceToSquared(neighbor.position);

      if (dSq > 0 && dSq < neighborDistSq) {
        // Separation
        if (dSq < separationDistSq) {
          diff.copy(entity.position).sub(neighbor.position);
          // Standard separation is diff / d (force)
          // Here we had diff.normalize() / d  --> (diff/d) / d = diff / d^2
          // So divideScalar(dSq) is mathematically equivalent and faster
          diff.divideScalar(dSq);
          sep.add(diff);
        }

        // Alignment
        if (neighbor.velocity) {
          ali.add(neighbor.velocity);
        }

        // Cohesion
        coh.add(neighbor.position);

        count++;
      }
    });

    if (count > 0) {
      // Separation
      if (sep.lengthSq() > 0) {
        sep.divideScalar(count);
        sep.normalize();
        sep.multiplyScalar(maxSpeed);
        sep.sub(entity.velocity!);
        sep.clampLength(0, maxForce);
      }

      // Alignment
      ali.divideScalar(count);
      ali.normalize();
      ali.multiplyScalar(maxSpeed);
      ali.sub(entity.velocity!);
      ali.clampLength(0, maxForce);

      // Cohesion
      coh.divideScalar(count);
      coh.sub(entity.position!);
      coh.normalize();
      coh.multiplyScalar(maxSpeed);
      coh.sub(entity.velocity!);
      coh.clampLength(0, maxForce);
    }

    // Apply weights
    sep.multiplyScalar(2.0);
    ali.multiplyScalar(1.0);
    coh.multiplyScalar(1.0);

    entity.steeringForce!.set(0, 0, 0).add(sep).add(ali).add(coh);

    // Soft Boundary (Sphere approx for now, or box)
    // Tank is box (-2,2), (-1,1), (-1,1)
    const x = entity.position!.x;
    const y = entity.position!.y;
    const z = entity.position!.z;

    steer.set(0, 0, 0);
    let boundForce = false;

    if (x < -SIMULATION_BOUNDS.x) {
      steer.x += 1;
      boundForce = true;
    }
    if (x > SIMULATION_BOUNDS.x) {
      steer.x -= 1;
      boundForce = true;
    }
    if (y < -SIMULATION_BOUNDS.y) {
      steer.y += 1;
      boundForce = true;
    }
    if (y > SIMULATION_BOUNDS.y) {
      steer.y -= 1;
      boundForce = true;
    }
    if (z < -SIMULATION_BOUNDS.z) {
      steer.z += 1;
      boundForce = true;
    }
    if (z > SIMULATION_BOUNDS.z) {
      steer.z -= 1;
      boundForce = true;
    }

    if (boundForce) {
      steer.normalize().multiplyScalar(maxSpeed);
      steer.sub(entity.velocity!).clampLength(0, maxForce * 2);
      entity.steeringForce!.add(steer);
    }

    // --- Feeding Logic ---
    // Seek closest food
    const foodEntities = world.with('isFood', 'position');
    let closestFood: Entity | null = null;
    let minFoodDistSq = Infinity;

    for (const food of foodEntities) {
      if (!food.position) continue;
      const dSq = entity.position!.distanceToSquared(food.position);
      if (dSq < minFoodDistSq) {
        minFoodDistSq = dSq;
        closestFood = food;
      }
    }

    // 5.0 * 5.0 = 25.0 (5m detection range)
    if (closestFood && minFoodDistSq < 25.0) {
      // Eating range: 0.1m * 0.1m = 0.01 (10cm for 1.5cm pellet)
      if (minFoodDistSq < 0.01) {
        // EAT IT - trigger particle burst at food location
        if (closestFood.position) {
          triggerEatingBurst(closestFood.position);
        }
        world.remove(closestFood);
      } else {
        // SEEK
        const seek = tempVec.copy(closestFood.position!).sub(entity.position!).normalize();
        seek.multiplyScalar(maxSpeed);
        seek.sub(entity.velocity!);
        seek.clampLength(0, maxForce * 2.0); // Stronger than boids
        entity.steeringForce!.add(seek);
      }
    }
  }
};

export const BoidsSystem = () => {
  useEffect(() => {
    return fixedScheduler.add(() => {
      updateBoidsLogic();
    });
  }, []);

  return null;
};
