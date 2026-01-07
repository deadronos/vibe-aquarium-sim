import { world } from '../../store';
import type { Entity } from '../../store';
import { ensureCapacity, type Float32Buffer } from './bufferManager';

export const fishSnapshot: Entity[] = [];
export const foodSnapshot: Entity[] = [];

// Re-usable buffers for serialization
let positions: Float32Buffer = new Float32Array(0);
let velocities: Float32Buffer = new Float32Array(0);
let foodPositions: Float32Buffer = new Float32Array(0);

export function updateSnapshots() {
  fishSnapshot.length = 0;
  for (const entity of world.with(
    'isBoid',
    'position',
    'velocity',
    'steeringForce',
    'externalForce'
  )) {
    fishSnapshot.push(entity);
  }

  foodSnapshot.length = 0;
  for (const entity of world.with('isFood', 'position')) {
    foodSnapshot.push(entity);
  }

  const fishCount = fishSnapshot.length;
  const foodCount = foodSnapshot.length;

  positions = ensureCapacity(positions, fishCount * 3);
  velocities = ensureCapacity(velocities, fishCount * 3);
  foodPositions = ensureCapacity(foodPositions, foodCount * 3);

  for (let i = 0; i < fishCount; i++) {
    const entity = fishSnapshot[i];
    if (!entity.position || !entity.velocity) continue;
    const base = i * 3;
    positions[base] = entity.position.x;
    positions[base + 1] = entity.position.y;
    positions[base + 2] = entity.position.z;
    velocities[base] = entity.velocity.x;
    velocities[base + 1] = entity.velocity.y;
    velocities[base + 2] = entity.velocity.z;
  }

  for (let i = 0; i < foodCount; i++) {
    const entity = foodSnapshot[i];
    if (!entity.position) continue;
    const base = i * 3;
    foodPositions[base] = entity.position.x;
    foodPositions[base + 1] = entity.position.y;
    foodPositions[base + 2] = entity.position.z;
  }

  return {
    fishSnapshot,
    foodSnapshot,
    positions: positions.subarray(0, fishCount * 3),
    velocities: velocities.subarray(0, fishCount * 3),
    foodPositions: foodPositions.subarray(0, foodCount * 3),
    fishCount,
    foodCount,
  };
}
