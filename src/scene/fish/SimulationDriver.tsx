import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SWIM_BOUNDS } from '../../config/scene';
import { OBSTACLES } from '../../sim/aquascape';
import { useAquarium } from '../../state/store';
import { daylight } from '../daylight';
import { simulation } from './simulation';

const FIXED_STEP = 1 / 60;
/** How often the care loop (algae, growth) moves on. It changes over days, so this is plenty. */
const CARE_TICK_MS = 60_000;
const environment = { activity: 1, food: simulation.food, obstacles: OBSTACLES, viewer: 0 };

/**
 * Advances the shared simulation on a fixed step and answers feed and tap requests from the HUD.
 * Mount it before `FishView` so each frame steps the sim before the view reads it.
 */
export const SimulationDriver = () => {
  const accumulator = useRef(0);
  const { school, food } = simulation;

  useEffect(() => {
    const { setFishCount, setReady, tickCare } = useAquarium.getState();
    setFishCount(school.count);
    setReady();
    const careTimer = window.setInterval(() => tickCare(Date.now()), CARE_TICK_MS);
    const unsubscribe = useAquarium.subscribe((state, previous) => {
      if (state.feedRequest !== previous.feedRequest) food.feed();
      if (state.tapRequest !== previous.tapRequest) {
        // A knuckle on the front glass, somewhere along the middle.
        const x = (Math.random() - 0.5) * (SWIM_BOUNDS.maxX - SWIM_BOUNDS.minX) * 0.6;
        school.startle(x, (SWIM_BOUNDS.minY + SWIM_BOUNDS.maxY) / 2, SWIM_BOUNDS.maxZ + 0.04);
      }
    });
    return () => {
      window.clearInterval(careTimer);
      unsubscribe();
    };
  }, [school, food]);

  useFrame((state, delta) => {
    accumulator.current = Math.min(accumulator.current + delta, FIXED_STEP * 5);
    environment.activity = daylight.fishActivity;
    // Someone up close at the glass: the fish notice over a couple of seconds.
    const close = useAquarium.getState().viewpoint === 'glass' ? 1 : 0;
    environment.viewer = THREE.MathUtils.damp(environment.viewer, close, 0.8, delta);
    while (accumulator.current >= FIXED_STEP) {
      school.step(FIXED_STEP, environment);
      food.step(FIXED_STEP, state.clock.elapsedTime);
      accumulator.current -= FIXED_STEP;
    }
  });

  return null;
};
