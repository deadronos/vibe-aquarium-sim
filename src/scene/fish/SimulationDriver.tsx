import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { OBSTACLES } from '../../sim/aquascape';
import { useAquarium } from '../../state/store';
import { daylight } from '../daylight';
import { simulation } from './simulation';

const FIXED_STEP = 1 / 60;
const environment = { activity: 1, food: simulation.food, obstacles: OBSTACLES };

/**
 * Advances the shared simulation on a fixed step and answers feed requests from the HUD.
 * Mount it before `FishView` so each frame steps the sim before the view reads it.
 */
export const SimulationDriver = () => {
  const accumulator = useRef(0);
  const { school, food } = simulation;

  useEffect(() => {
    const { setFishCount, setReady } = useAquarium.getState();
    setFishCount(school.count);
    setReady();
    return useAquarium.subscribe((state, previous) => {
      if (state.feedRequest !== previous.feedRequest) food.feed();
    });
  }, [school, food]);

  useFrame((state, delta) => {
    accumulator.current = Math.min(accumulator.current + delta, FIXED_STEP * 5);
    environment.activity = daylight.fishActivity;
    while (accumulator.current >= FIXED_STEP) {
      school.step(FIXED_STEP, environment);
      food.step(FIXED_STEP, state.clock.elapsedTime);
      accumulator.current -= FIXED_STEP;
    }
  });

  return null;
};
