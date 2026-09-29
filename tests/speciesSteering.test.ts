import { describe, expect, it } from 'vitest';
import { simulateStep } from '../src/workers/boids/index';
import { BOIDS_CONFIG, SIMULATION_BOUNDS, SPECIES_CONFIG } from '../src/config/constants';
import { currentPhysics, waterPhysics } from '../src/config/waterPhysics';
import type { SimulationInput } from '../src/workers/boids/types';

function createInput(speciesIndices: number[]): SimulationInput {
  const fishCount = speciesIndices.length;
  const positions = new Float32Array(fishCount * 3);
  const velocities = new Float32Array(fishCount * 3);
  // Fish 1 sits 0.3 units from fish 0, inside every species' perception range.
  if (fishCount > 1) positions[3] = 0.3;

  return {
    snapshotRevision: 1,
    fishCount,
    positions,
    velocities,
    speciesIndices: Int32Array.from(speciesIndices),
    species: SPECIES_CONFIG,
    foodCount: 0,
    foodPositions: new Float32Array(0),
    time: 0,
    boids: BOIDS_CONFIG,
    bounds: SIMULATION_BOUNDS,
    water: waterPhysics,
    current: currentPhysics,
  };
}

describe('per-species worker steering', () => {
  it('reads the per-fish species index independently of any render model', () => {
    // The worker never receives a model index, only species indices.
    const asTetra = Array.from(simulateStep(createInput([0, 1])).steering.subarray(0, 6));
    const asBetta = Array.from(simulateStep(createInput([2, 1])).steering.subarray(0, 6));

    // Fish 0 changed species -> its steering changed.
    expect(asBetta.slice(0, 3)).not.toEqual(asTetra.slice(0, 3));
    // Fish 1 kept the same species -> its steering is unchanged.
    expect(asBetta.slice(3, 6)).toEqual(asTetra.slice(3, 6));
  });

  it('is deterministic for identical inputs', () => {
    const first = Array.from(simulateStep(createInput([0, 2, 1])).steering);
    const second = Array.from(simulateStep(createInput([0, 2, 1])).steering);
    expect(second).toEqual(first);
  });
});
