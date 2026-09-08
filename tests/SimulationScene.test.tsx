import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Spawner } from '../src/systems/Spawner';
import { SchedulerSystem } from '../src/systems/SchedulerSystem';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { world } from '../src/store';
import { fixedScheduler } from '../src/utils/FixedStepScheduler';
import { getDecorationSpawnDescriptors, getInitialFishSpawn } from '../src/config/artDirection';

vi.mock('@react-three/rapier', () => ({
  useBeforePhysicsStep: () => {},
}));

describe('SimulationScene integration', () => {
  beforeEach(() => {
    // Iterate securely using Array.from to prevent mutation during iteration issues if any exist,
    // though the lint said world.entities is already iterable and we can avoid.
    // We will just remove from an array copy.
    const ents = Array.from(world.entities);
    for (const entity of ents) {
      world.remove(entity);
    }
    fixedScheduler.reset();
  });

  it('mounts, unmounts, and remounts idempotently without leaking entities or scheduler state', async () => {
    expect(world.entities.length).toBe(0);
    const initialMaxSubSteps = fixedScheduler.getMaxSubSteps();

    // 1. Mount
    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider isWebGPU={false}>
        <Spawner />
        <SchedulerSystem />
      </VisualQualityProvider>
    );

    // Spawner mounts synchronously in useEffect
    const expectedCount = 30 + getDecorationSpawnDescriptors().length;
    expect(world.entities.length).toBe(expectedCount);

    const fish = world.with('isFish').entities;
    expect(fish.map((entity) => entity.modelIndex).sort()).toEqual(
      Array.from({ length: 30 }, (_, index) => getInitialFishSpawn(index, 30).modelIndex).sort()
    );
    expect(Math.min(...fish.map((entity) => entity.position?.x ?? 0))).toBeLessThan(-0.5);
    expect(Math.max(...fish.map((entity) => entity.position?.x ?? 0))).toBeGreaterThan(0.5);

    const decorations = world.with('isDecoration').entities;
    expect(
      decorations.map((entity) => entity.position?.x ?? 0).every((x) => Math.abs(x) >= 0.42)
    ).toBe(true);

    // Simulate adaptive scheduler reducing max steps
    fixedScheduler.setMaxSubSteps(1);

    // 2. Unmount
    await renderer.unmount();

    // Verify cleanup
    expect(world.entities.length).toBe(0);
    expect(fixedScheduler.getMaxSubSteps()).toBe(initialMaxSubSteps);

    // 3. Remount
    const renderer2 = await ReactThreeTestRenderer.create(
      <VisualQualityProvider isWebGPU={false}>
        <Spawner />
        <SchedulerSystem />
      </VisualQualityProvider>
    );

    // Verify stable entity count (idempotent, no duplicates)
    expect(world.entities.length).toBe(expectedCount);

    await renderer2.unmount();
  });
});
