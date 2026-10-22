import * as THREE from 'three';
import type { Lighting, Rgb } from '../sim/timeOfDay';

/**
 * Live, smoothed lighting state. The DaylightDriver writes it once per frame (before anything
 * else renders); lights and materials read it. Plain mutable objects keep the frame loop
 * allocation-free.
 */
export const daylight = {
  hour: 12,
  sunDirection: new THREE.Vector3(1, -0.6, 0),
  sunColor: new THREE.Color(),
  sunIntensity: 0,
  skyTop: new THREE.Color(),
  skyHorizon: new THREE.Color(),
  ambientColor: new THREE.Color(),
  ambientIntensity: 0,
  lamp: 0,
  tankLight: 1,
  moonLight: 0,
  fishActivity: 1,
};

const target = new THREE.Color();

const approachColor = (color: THREE.Color, rgb: Rgb, t: number) => {
  target.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
  color.lerp(target, t);
};

/** Eases the live state towards a lighting sample; t = 1 snaps. */
export const approachLighting = (lighting: Lighting, t: number) => {
  const [dx, dy, dz] = lighting.sunDirection;
  daylight.sunDirection.x += (dx - daylight.sunDirection.x) * t;
  daylight.sunDirection.y += (dy - daylight.sunDirection.y) * t;
  daylight.sunDirection.z += (dz - daylight.sunDirection.z) * t;
  daylight.sunDirection.normalize();
  approachColor(daylight.sunColor, lighting.sunColor, t);
  approachColor(daylight.skyTop, lighting.skyTop, t);
  approachColor(daylight.skyHorizon, lighting.skyHorizon, t);
  approachColor(daylight.ambientColor, lighting.ambientColor, t);
  daylight.sunIntensity += (lighting.sunIntensity - daylight.sunIntensity) * t;
  daylight.ambientIntensity += (lighting.ambientIntensity - daylight.ambientIntensity) * t;
  daylight.lamp += (lighting.lamp - daylight.lamp) * t;
  daylight.tankLight += (lighting.tankLight - daylight.tankLight) * t;
  daylight.moonLight += (lighting.moonLight - daylight.moonLight) * t;
  daylight.fishActivity += (lighting.fishActivity - daylight.fishActivity) * t;
};
