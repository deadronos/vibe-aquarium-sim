import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { world } from '../store';
import { computeWaterCurrent } from '../utils/physicsHelpers';

// Temp vector reused in loop
const tempCurrent = new Vector3();

/**
 * Compute a simple procedural water current vector for a given position and time.
 * Returns true if a non-negligible current was written to `out`.
 */
// computeWaterCurrent moved to utils for reuse/tests

export const WaterCurrentSystem = () => {
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    for (const e of world.with('isFish', 'position', 'externalForce')) {
      // position is required by the query; compute current and add to externalForce
      if (!e.position || !e.externalForce) continue;
      if (computeWaterCurrent(e.position, t, tempCurrent)) {
        e.externalForce.add(tempCurrent);
      }
    }
  });

  return null;
};

export default WaterCurrentSystem;
