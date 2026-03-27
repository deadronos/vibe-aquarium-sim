import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { world } from '../src/store';
import { updateSnapshots } from '../src/systems/boids/snapshot';
import { applySimulationResult } from '../src/systems/boids/resultApplier';
import * as effectsBus from '../src/utils/effectsBus';

describe('applySimulationResult', () => {
  beforeEach(() => {
    for (const entity of Array.from(world.entities)) {
      world.remove(entity);
    }
    vi.restoreAllMocks();
  });

  it('applies worker results when the snapshot revision matches', () => {
    const fish = world.add({
      isFish: true,
      isBoid: true,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      steeringForce: new THREE.Vector3(),
      externalForce: new THREE.Vector3(),
      targetVelocity: new THREE.Vector3(),
    });
    const food = world.add({
      isFood: true,
      position: new THREE.Vector3(1, 0, 0),
    });

    const { fishCount, snapshotRevision } = updateSnapshots();
    const triggerSpy = vi.spyOn(effectsBus, 'triggerEffect');

    applySimulationResult(
      {
        snapshotRevision,
        steering: new Float32Array([1, 2, 3]),
        externalForces: new Float32Array([4, 5, 6]),
        eatenFoodIndices: [0],
      },
      fishCount
    );

    expect(fish.steeringForce?.toArray()).toEqual([1, 2, 3]);
    expect(fish.externalForce?.toArray()).toEqual([4, 5, 6]);
    expect(world.has(food)).toBe(false);
    expect(triggerSpy).toHaveBeenCalledWith('EAT', expect.any(THREE.Vector3));
  });

  it('ignores stale worker results after the snapshot has advanced', () => {
    const fish = world.add({
      isFish: true,
      isBoid: true,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      steeringForce: new THREE.Vector3(),
      externalForce: new THREE.Vector3(),
      targetVelocity: new THREE.Vector3(),
    });
    const food = world.add({
      isFood: true,
      position: new THREE.Vector3(1, 0, 0),
    });

    const { fishCount, snapshotRevision } = updateSnapshots();

    world.add({
      isFish: true,
      isBoid: true,
      position: new THREE.Vector3(2, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      steeringForce: new THREE.Vector3(),
      externalForce: new THREE.Vector3(),
      targetVelocity: new THREE.Vector3(),
    });
    updateSnapshots();

    const triggerSpy = vi.spyOn(effectsBus, 'triggerEffect');

    applySimulationResult(
      {
        snapshotRevision,
        steering: new Float32Array([1, 2, 3]),
        externalForces: new Float32Array([4, 5, 6]),
        eatenFoodIndices: [0],
      },
      fishCount
    );

    expect(fish.steeringForce?.toArray()).toEqual([0, 0, 0]);
    expect(fish.externalForce?.toArray()).toEqual([0, 0, 0]);
    expect(world.has(food)).toBe(true);
    expect(triggerSpy).not.toHaveBeenCalled();
  });
});