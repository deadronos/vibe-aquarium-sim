import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useAquarium } from '../state/store';
import { hourFromDate, lightingAt, wrapHour } from '../sim/timeOfDay';
import type { Lighting } from '../sim/timeOfDay';
import { approachLighting, daylight } from './daylight';
import { waterUniforms } from './tank/underwater';

/** One simulated day per six real minutes in "cycle" mode. */
const CYCLE_HOURS_PER_SECOND = 24 / 360;
const SAMPLE_INTERVAL = 0.2;

/** Advances the clock and eases the shared lighting state. Mount before anything that reads it. */
export const DaylightDriver = () => {
  const sample = useRef<Lighting | null>(null);
  const sinceSample = useRef(SAMPLE_INTERVAL);
  const cycleHour = useRef<number | null>(null);
  const published = useRef(-1);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const { clockMode, manualHour, displayHour, setDisplayHour } = useAquarium.getState();

    if (clockMode === 'cycle') {
      cycleHour.current = wrapHour(
        (cycleHour.current ?? displayHour) + dt * CYCLE_HOURS_PER_SECOND
      );
    } else {
      cycleHour.current = null;
    }

    sinceSample.current += dt;
    if (sinceSample.current >= SAMPLE_INTERVAL || !sample.current) {
      sinceSample.current = 0;
      const hour =
        clockMode === 'live'
          ? hourFromDate(new Date())
          : clockMode === 'cycle'
            ? cycleHour.current!
            : manualHour;
      daylight.hour = hour;
      const first = sample.current === null;
      sample.current = lightingAt(hour);
      if (first) approachLighting(sample.current, 1);
      const minute = Math.floor(hour * 60);
      if (minute !== published.current) {
        published.current = minute;
        setDisplayHour(hour);
      }
    }
    approachLighting(sample.current, 1 - Math.exp(-dt * 2.5));

    waterUniforms.uTime.value = state.clock.elapsedTime;
    waterUniforms.uTankLight.value = daylight.tankLight;
    waterUniforms.uMoonLight.value = daylight.moonLight;
  }, -1);

  return null;
};
