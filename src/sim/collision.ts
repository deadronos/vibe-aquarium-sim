import type { Obstacle } from './aquascape';
import { SWIM_BOUNDS } from '../config/scene';

const clampUnit = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Projects a fish out of all driftwood capsules, repeating the pass because correcting against
 * one overlapping branch can move it into a segment already visited. Arrays are supplied by the
 * caller, so the normal simulation path allocates nothing.
 */
export const resolveCapsulePenetrations = (
  position: Float32Array,
  velocity: Float32Array,
  offset: number,
  bodyLength: number,
  obstacles: readonly Obstacle[],
  minimumY = Number.NEGATIVE_INFINITY,
  passes = 12
) => {
  for (let pass = 0; pass < passes; pass++) {
    let changed = false;
    for (let k = 0; k < obstacles.length; k++) {
      const obstacle = obstacles[k]!;
      if (obstacle.kind !== 'capsule') continue;
      const sx = obstacle.bx - obstacle.ax;
      const sy = obstacle.by - obstacle.ay;
      const sz = obstacle.bz - obstacle.az;
      const length2 = sx * sx + sy * sy + sz * sz;
      const t =
        length2 > 0
          ? clampUnit(
              ((position[offset]! - obstacle.ax) * sx +
                (position[offset + 1]! - obstacle.ay) * sy +
                (position[offset + 2]! - obstacle.az) * sz) /
                length2
            )
          : 0;
      const dx = position[offset]! - (obstacle.ax + sx * t);
      const dy = position[offset + 1]! - (obstacle.ay + sy * t);
      const dz = position[offset + 2]! - (obstacle.az + sz * t);
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const clearance = obstacle.radius + bodyLength * 0.2;
      if (distance >= clearance) continue;

      const normalX = distance > 1e-6 ? dx / distance : 1;
      const normalY = distance > 1e-6 ? dy / distance : 0;
      const normalZ = distance > 1e-6 ? dz / distance : 0;
      const correction = clearance - distance;
      const proposedY = position[offset + 1]! + normalY * correction;
      let correctionX = normalX;
      let correctionY = normalY;
      let correctionZ = normalZ;
      if (proposedY < minimumY) {
        position[offset + 1] = minimumY;
        const floorDy = minimumY - (obstacle.ay + sy * t);
        const nearestX = obstacle.ax + sx * t;
        const nearestZ = obstacle.az + sz * t;
        const currentX = position[offset]!;
        const currentZ = position[offset + 2]!;
        const radialX = currentX - nearestX;
        const radialZ = currentZ - nearestZ;
        const horizontal = Math.hypot(radialX, radialZ);
        const targetHorizontal = Math.sqrt(Math.max(0, clearance * clearance - floorDy * floorDy));
        let bestX = currentX;
        let bestZ = currentZ;
        let bestMove2 = Number.POSITIVE_INFINITY;
        if (horizontal > 1e-6) {
          const candidateX = nearestX + (radialX / horizontal) * targetHorizontal;
          const candidateZ = nearestZ + (radialZ / horizontal) * targetHorizontal;
          const move2 =
            (candidateX - currentX) * (candidateX - currentX) +
            (candidateZ - currentZ) * (candidateZ - currentZ);
          if (
            candidateX >= SWIM_BOUNDS.minX &&
            candidateX <= SWIM_BOUNDS.maxX &&
            candidateZ >= SWIM_BOUNDS.minZ &&
            candidateZ <= SWIM_BOUNDS.maxZ &&
            move2 < bestMove2
          ) {
            bestX = candidateX;
            bestZ = candidateZ;
            bestMove2 = move2;
          }
        }
        const requiredX2 = clearance * clearance - floorDy * floorDy - radialZ * radialZ;
        if (requiredX2 >= 0) {
          const requiredX = Math.sqrt(requiredX2);
          let candidateX = nearestX - requiredX;
          let move2 = (candidateX - currentX) * (candidateX - currentX);
          if (
            candidateX >= SWIM_BOUNDS.minX &&
            candidateX <= SWIM_BOUNDS.maxX &&
            move2 < bestMove2
          ) {
            bestX = candidateX;
            bestZ = currentZ;
            bestMove2 = move2;
          }
          candidateX = nearestX + requiredX;
          move2 = (candidateX - currentX) * (candidateX - currentX);
          if (
            candidateX >= SWIM_BOUNDS.minX &&
            candidateX <= SWIM_BOUNDS.maxX &&
            move2 < bestMove2
          ) {
            bestX = candidateX;
            bestZ = currentZ;
            bestMove2 = move2;
          }
        }
        const requiredZ2 = clearance * clearance - floorDy * floorDy - radialX * radialX;
        if (requiredZ2 >= 0) {
          const requiredZ = Math.sqrt(requiredZ2);
          let candidateZ = nearestZ - requiredZ;
          let move2 = (candidateZ - currentZ) * (candidateZ - currentZ);
          if (
            candidateZ >= SWIM_BOUNDS.minZ &&
            candidateZ <= SWIM_BOUNDS.maxZ &&
            move2 < bestMove2
          ) {
            bestX = currentX;
            bestZ = candidateZ;
            bestMove2 = move2;
          }
          candidateZ = nearestZ + requiredZ;
          move2 = (candidateZ - currentZ) * (candidateZ - currentZ);
          if (
            candidateZ >= SWIM_BOUNDS.minZ &&
            candidateZ <= SWIM_BOUNDS.maxZ &&
            move2 < bestMove2
          ) {
            bestX = currentX;
            bestZ = candidateZ;
            bestMove2 = move2;
          }
        }
        const moveX = bestX - currentX;
        const moveZ = bestZ - currentZ;
        const moveLength = Math.hypot(moveX, moveZ);
        correctionX = moveLength > 1e-6 ? moveX / moveLength : 0;
        correctionY = 0;
        correctionZ = moveLength > 1e-6 ? moveZ / moveLength : 0;
        position[offset] = bestX;
        position[offset + 2] = bestZ;
      } else {
        position[offset] = position[offset]! + correctionX * correction;
        position[offset + 1] = proposedY;
        position[offset + 2] = position[offset + 2]! + correctionZ * correction;
      }
      const inward =
        velocity[offset]! * correctionX +
        velocity[offset + 1]! * correctionY +
        velocity[offset + 2]! * correctionZ;
      if (inward < 0) {
        velocity[offset] = velocity[offset]! - correctionX * inward;
        velocity[offset + 1] = velocity[offset + 1]! - correctionY * inward;
        velocity[offset + 2] = velocity[offset + 2]! - correctionZ * inward;
      }
      changed = true;
    }
    if (!changed) break;
  }
};
