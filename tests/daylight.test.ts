import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { approachLighting, daylight } from '../src/scene/daylight';
import { lightingAt } from '../src/sim/timeOfDay';

const SCALARS = [
  'sunIntensity',
  'ambientIntensity',
  'lamp',
  'tankLight',
  'moonLight',
  'fishActivity',
] as const;

const srgb = (color: THREE.Color) => color.getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);

describe('live daylight state', () => {
  it('snaps to a lighting sample when t = 1', () => {
    const noon = lightingAt(12);
    approachLighting(noon, 1);
    for (const key of SCALARS) expect(daylight[key]).toBeCloseTo(noon[key], 9);
    const sun = new THREE.Vector3(...noon.sunDirection).normalize();
    expect(daylight.sunDirection.distanceTo(sun)).toBeLessThan(1e-9);
    const { r, g, b } = srgb(daylight.skyTop);
    [r, g, b].forEach((v, i) => expect(v).toBeCloseTo(noon.skyTop[i]!, 4));
  });

  it('eases part of the way towards a new sample', () => {
    const noon = lightingAt(12);
    const night = lightingAt(2);
    approachLighting(noon, 1);
    approachLighting(night, 0.25);
    for (const key of SCALARS)
      expect(daylight[key]).toBeCloseTo(noon[key] + (night[key] - noon[key]) * 0.25, 9);
  });

  it('keeps the sun direction a unit vector and converges', () => {
    approachLighting(lightingAt(8), 1);
    const dusk = lightingAt(19);
    for (let i = 0; i < 200; i++) {
      approachLighting(dusk, 0.1);
      expect(daylight.sunDirection.length()).toBeCloseTo(1, 9);
    }
    for (const key of SCALARS) expect(daylight[key]).toBeCloseTo(dusk[key], 6);
  });

  it('leaves the state alone when t = 0', () => {
    approachLighting(lightingAt(12), 1);
    const before = { lamp: daylight.lamp, sun: daylight.sunDirection.clone() };
    approachLighting(lightingAt(23), 0);
    expect(daylight.lamp).toBe(before.lamp);
    expect(daylight.sunDirection.distanceTo(before.sun)).toBeLessThan(1e-12);
  });
});
