import { Vector3 } from 'three';

import { useGameStore } from '../gameStore';
import { SIMULATION_BOUNDS } from '../config/constants';
import { world } from '../store';

export const TANK_CENTER = new Vector3(0, 0, 0);

type BubbleConfig = Array<{
  offset: Vector3;
  speed: number;
  phase: number;
  size: number;
  wobble: number;
}>;

function createBubbleConfig(): BubbleConfig {
  return Array.from({ length: 8 }, () => ({
    offset: new Vector3(
      (Math.random() - 0.5) * 0.04,
      Math.random() * 0.03,
      (Math.random() - 0.5) * 0.04
    ),
    speed: 0.15 + Math.random() * 0.2,
    phase: Math.random() * Math.PI * 2,
    size: 0.004 + Math.random() * 0.006,
    wobble: 0.01 + Math.random() * 0.015,
  }));
}

/**
 * Apply the shared feeding side effects for pointer and keyboard activation.
 * The caller owns any pointer-only visual effect such as a click ripple.
 */
export function feedAt(point: Vector3): void {
  const fishEntities = world.with('isFish', 'position');
  for (const fish of fishEntities) {
    if (!fish.position) continue;
    if (fish.position.distanceToSquared(point) < 4.0) {
      fish.excitementLevel = 1.0;
      fish.excitementDecay = 1.0;
    }
  }

  const x = Math.max(-SIMULATION_BOUNDS.x, Math.min(SIMULATION_BOUNDS.x, point.x));
  const z = Math.max(-SIMULATION_BOUNDS.z, Math.min(SIMULATION_BOUNDS.z, point.z));
  world.add({
    isFood: true,
    position: new Vector3(x, point.y, z),
    velocity: new Vector3((Math.random() - 0.5) * 0.05, -0.08, (Math.random() - 0.5) * 0.05),
    bubbleConfig: createBubbleConfig(),
  });

  useGameStore.getState().setLastFedTime(new Date());
}
