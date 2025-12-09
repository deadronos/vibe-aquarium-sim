import { Vector3 } from 'three';
import { world } from '../store';
import { useEffect } from 'react';
import { fixedScheduler } from '../utils/FixedStepScheduler';

// Temporary vectors to avoid GC in the loop
const sep = new Vector3();
const ali = new Vector3();
const coh = new Vector3();
const diff = new Vector3();
const steer = new Vector3();

// Adjusted for 4m x 2m x 2m tank and 12cm fish
// 1 unit = 1 meter. Fish is ~0.12m.
// Cruising speed ~2-3 body lengths/s => ~0.3 - 0.4 m/s
const NEIGHBOR_DIST = 0.6;
const SEPARATION_DIST = 0.25;
const MAX_SPEED = 0.4;
const MAX_FORCE = 0.5;

const updateBoidsLogic = () => {
  // We only iterate over entities that have all the required components
  const boids = world.with('isBoid', 'position', 'velocity', 'steeringForce');

  for (const entity of boids) {
    sep.set(0, 0, 0);
    ali.set(0, 0, 0);
    coh.set(0, 0, 0);

    let count = 0;

    for (const neighbor of boids) {
      if (entity === neighbor) continue;

      const d = entity.position.distanceTo(neighbor.position);

      if (d > 0 && d < NEIGHBOR_DIST) {
        // Separation
        if (d < SEPARATION_DIST) {
          diff.copy(entity.position).sub(neighbor.position);
          diff.normalize();
          diff.divideScalar(d);
          sep.add(diff);
        }

        // Alignment
        ali.add(neighbor.velocity);

        // Cohesion
        coh.add(neighbor.position);

        count++;
      }
    }

    if (count > 0) {
      // Separation
      if (sep.lengthSq() > 0) {
        sep.divideScalar(count);
        sep.normalize();
        sep.multiplyScalar(MAX_SPEED);
        sep.sub(entity.velocity);
        sep.clampLength(0, MAX_FORCE);
      }

      // Alignment
      ali.divideScalar(count);
      ali.normalize();
      ali.multiplyScalar(MAX_SPEED);
      ali.sub(entity.velocity);
      ali.clampLength(0, MAX_FORCE);

      // Cohesion
      coh.divideScalar(count);
      coh.sub(entity.position);
      coh.normalize();
      coh.multiplyScalar(MAX_SPEED);
      coh.sub(entity.velocity);
      coh.clampLength(0, MAX_FORCE);
    }

    // Apply weights
    sep.multiplyScalar(2.0);
    ali.multiplyScalar(1.0);
    coh.multiplyScalar(1.0);

    entity.steeringForce.set(0, 0, 0).add(sep).add(ali).add(coh);

    // Soft Boundary (Sphere approx for now, or box)
    // Tank is box (-2,2), (-1,1), (-1,1)
    const x = entity.position.x;
    const y = entity.position.y;
    const z = entity.position.z;

    steer.set(0, 0, 0);
    let boundForce = false;

    if (x < -1.7) {
      steer.x += 1;
      boundForce = true;
    }
    if (x > 1.7) {
      steer.x -= 1;
      boundForce = true;
    }
    if (y < -0.7) {
      steer.y += 1;
      boundForce = true;
    }
    if (y > 0.7) {
      steer.y -= 1;
      boundForce = true;
    }
    if (z < -0.7) {
      steer.z += 1;
      boundForce = true;
    }
    if (z > 0.7) {
      steer.z -= 1;
      boundForce = true;
    }

    if (boundForce) {
      steer.normalize().multiplyScalar(MAX_SPEED);
      steer.sub(entity.velocity).clampLength(0, MAX_FORCE * 2);
      entity.steeringForce.add(steer);
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
