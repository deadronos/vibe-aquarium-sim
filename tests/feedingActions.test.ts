import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';

import { useGameStore } from '../src/gameStore';
import { world } from '../src/store';
import { feedAt } from '../src/game/feedingActions';
import { resetWorld } from './support/stores';

describe('feedAt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-11-14T22:13:20.000Z'));
    resetWorld();
    useGameStore.setState({ lastFedTime: null });
  });

  afterEach(() => {
    resetWorld();
    vi.useRealTimers();
  });

  it('spawns reachable food at the requested tank center', () => {
    feedAt(new Vector3(0, 0, 0));

    const food = world.with('isFood').entities;
    expect(food).toHaveLength(1);
    expect(food[0]?.position?.x).toBe(0);
    expect(food[0]?.position?.z).toBe(0);
    expect(useGameStore.getState().lastFedTime).toEqual(new Date('2023-11-14T22:13:20.000Z'));
  });
});
