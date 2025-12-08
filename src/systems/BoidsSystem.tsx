import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { world } from "../store";

// Temporary vectors to avoid GC in the loop
const sep = new Vector3();
const ali = new Vector3();
const coh = new Vector3();
const diff = new Vector3();
const steer = new Vector3();

const NEIGHBOR_DIST = 4;
const SEPARATION_DIST = 1.5;
const MAX_SPEED = 4;
const MAX_FORCE = 0.2;

export const BoidsSystem = () => {
  useFrame(() => {
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

      // Sum forces into steeringForce
      // IMPORTANT: We overwrite steeringForce here, assuming this is the only system writing to it per frame for boids
      entity.steeringForce.set(0,0,0).add(sep).add(ali).add(coh);

      // Boundary / Centering (soft bounds)
      const distFromCenter = entity.position.length();
      if (distFromCenter > 8) {
          steer.copy(entity.position).multiplyScalar(-1).normalize().multiplyScalar(MAX_SPEED);
          steer.sub(entity.velocity).clampLength(0, MAX_FORCE * 3);
          entity.steeringForce.add(steer);
      }
    }
  });

  return null;
};
