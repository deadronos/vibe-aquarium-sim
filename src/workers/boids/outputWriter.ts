import type {
  EatenFoodIndices,
  Float32Buffer,
  SimulationOutput,
  SimulationOutputTarget,
} from './types';

export function writeSimulationOutput(
  snapshotRevision: number,
  fishCount: number,
  steering: Float32Buffer,
  externalForces: Float32Buffer,
  eatenFoodIndices: EatenFoodIndices,
  outputTarget?: SimulationOutputTarget
): SimulationOutput {
  // Return subarrays
  if (outputTarget) {
    const sharedEatenFoodIndices = outputTarget.eatenFoodIndices;
    const eatenFoodCount = Math.min(eatenFoodIndices.length, sharedEatenFoodIndices.length);

    for (let i = 0; i < eatenFoodCount; i++) {
      sharedEatenFoodIndices[i] = eatenFoodIndices[i];
    }
    if (outputTarget.eatenFoodCount) {
      outputTarget.eatenFoodCount[0] = eatenFoodCount;
    }

    return {
      snapshotRevision,
      steering,
      externalForces,
      eatenFoodIndices: sharedEatenFoodIndices.subarray(0, eatenFoodCount),
    };
  }

  return {
    snapshotRevision,
    steering: steering.subarray(0, fishCount * 3),
    externalForces: externalForces.subarray(0, fishCount * 3),
    eatenFoodIndices,
  };
}
