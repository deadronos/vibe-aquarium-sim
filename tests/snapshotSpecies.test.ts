import { afterEach, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { world } from '../src/store';
import { updateSnapshots } from '../src/systems/boids/snapshot';
import { speciesIndexFor } from '../src/domain/species';
import { resetWorld } from './support/stores';

afterEach(() => {
  resetWorld();
});

describe('boids snapshot species mapping', () => {
  it('sends the species index derived from speciesId, independent of the render model', () => {
    world.add({
      isFish: true,
      isBoid: true,
      position: new Vector3(),
      velocity: new Vector3(),
      steeringForce: new Vector3(),
      externalForce: new Vector3(),
      speciesId: 'betta',
      modelIndex: 0,
    });

    const snapshot = updateSnapshots();

    expect(snapshot.speciesIndices[0]).toBe(speciesIndexFor('betta'));
    expect(snapshot.speciesIndices[0]).toBe(2);
  });

  it('defaults unknown or missing species to the first entry', () => {
    world.add({
      isFish: true,
      isBoid: true,
      position: new Vector3(),
      velocity: new Vector3(),
      steeringForce: new Vector3(),
      externalForce: new Vector3(),
      modelIndex: 2,
    });

    const snapshot = updateSnapshots();

    expect(snapshot.speciesIndices[0]).toBe(0);
  });
});
