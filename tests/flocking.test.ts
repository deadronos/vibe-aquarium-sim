import { describe, expect, it } from 'vitest';
import { simulateStep } from '../src/workers/boids/index';
import { accumulateFlocking } from '../src/workers/boids/flocking';
import { deriveCellSize } from '../src/workers/boids/params';
import { writeSimulationOutput } from '../src/workers/boids/outputWriter';
import { getBoidsCache } from '../src/workers/boids/cache';
import { populateSpatialHash } from '../src/workers/boids/spatialHash';
import type { SpeciesParams } from '../src/workers/boids/types';
import { createSimulationInput } from './support/simulationInput';

const speciesParams = (neighborDist: number): SpeciesParams => ({
  maxSpeed: 5,
  maxForce: 0.1,
  neighborDist,
  separationDist: 5,
  weights: { separation: 2, alignment: 1, cohesion: 1 },
});

describe('deriveCellSize', () => {
  it('uses the largest species neighborDist scaled by 2.5', () => {
    const species = [speciesParams(4), speciesParams(12)];
    expect(deriveCellSize(species, { neighborDist: 3 })).toBe(30);
  });

  it('falls back to boids.neighborDist when species is empty', () => {
    expect(deriveCellSize([], { neighborDist: 10 })).toBe(25);
  });
});

describe('writeSimulationOutput', () => {
  it('writes into the shared target buffers and returns a matching subarray', () => {
    const steering = new Float32Array([1, 2, 3]);
    const externalForces = new Float32Array([4, 5, 6]);
    const eatenFoodIndices = [0, 2];
    const target = {
      steering: new Float32Array(3),
      externalForces: new Float32Array(3),
      eatenFoodIndices: new Int32Array(4),
      eatenFoodCount: new Int32Array(1),
    };

    const out = writeSimulationOutput(7, 1, steering, externalForces, eatenFoodIndices, target);

    expect(out.snapshotRevision).toBe(7);
    expect(Array.from(target.eatenFoodIndices.subarray(0, 2))).toEqual([0, 2]);
    expect(target.eatenFoodCount[0]).toBe(2);
    expect(Array.from(out.eatenFoodIndices)).toEqual([0, 2]);
  });

  it('returns subarrays sized to fishCount when no target is provided', () => {
    const steering = new Float32Array(9);
    const externalForces = new Float32Array(9);
    const out = writeSimulationOutput(1, 2, steering, externalForces, []);

    expect(out.steering.length).toBe(6);
    expect(out.externalForces.length).toBe(6);
    expect(out.eatenFoodIndices).toEqual([]);
  });
});

describe('accumulateFlocking parity with the pre-refactor implementation', () => {
  it('matches the frozen b8304d2 steering snapshot for a 2-fish fixture', () => {
    const positions = new Float32Array([0, 0, 0, 0.3, 0.1, -0.2]);
    const velocities = new Float32Array([1, 0.2, -0.1, -0.4, 0.7, 0.3]);
    const input = createSimulationInput({
      fishCount: 2,
      foodCount: 0,
      positions,
      velocities,
      speciesIndices: Int32Array.from([0, 0]),
    });

    // Hard-coded steering vector produced by the ORIGINAL inline flocking math
    // at base commit b8304d2. This is an independent oracle: simulateStep now
    // delegates to accumulateFlocking, so comparing the two would be circular
    // and could never catch a regression in the extracted math.
    // In bounds and no food, so boundary + feeding contribute zero and the
    // reported steering is exactly the accumulated flocking steering.
    const expected = new Float32Array([
      -0.1572452038526535, 0.04707733541727066, 0.06507682055234909, 0.1878468543291092,
      -0.013720542192459106, -0.07606726139783859,
    ]);

    const cache = getBoidsCache(2, 0);
    const cellSize = deriveCellSize(input.species, input.boids);
    populateSpatialHash(2, positions, cache, cellSize);

    const out = { x: 0, y: 0, z: 0 };
    const actual = new Float32Array(expected.length);
    for (let i = 0; i < 2; i++) {
      accumulateFlocking(i, positions, velocities, input.species[0], cache, cellSize, out);
      actual[i * 3] = out.x;
      actual[i * 3 + 1] = out.y;
      actual[i * 3 + 2] = out.z;
    }

    expect(Array.from(actual)).toEqual(Array.from(expected));
    expect(Array.from(actual).some((v) => v !== 0)).toBe(true);

    // The full step must also match the frozen snapshot; with no food and in
    // bounds its steering is exactly the accumulated flocking steering.
    expect(Array.from(simulateStep(input).steering)).toEqual(Array.from(expected));
  });
});
