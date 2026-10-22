export type Rgb = readonly [number, number, number];

export interface Lighting {
  /** Unit vector the sunlight travels along (world space). */
  sunDirection: [number, number, number];
  sunColor: Rgb;
  sunIntensity: number;
  skyTop: Rgb;
  skyHorizon: Rgb;
  ambientColor: Rgb;
  ambientIntensity: number;
  /** 0..1 — the floor lamp is switched on in the evening. */
  lamp: number;
  /** 0..1 — main tank LED, on a 09:00–21:00 schedule with sunrise/sunset ramps. */
  tankLight: number;
  /** 0..1 — blue night LED. */
  moonLight: number;
  /** 0..1 — how lively the fish are. */
  fishActivity: number;
}

interface SkyKey {
  h: number;
  top: Rgb;
  horizon: Rgb;
  sun: Rgb;
}

const hex = (value: number): Rgb => [
  ((value >> 16) & 255) / 255,
  ((value >> 8) & 255) / 255,
  (value & 255) / 255,
];

const SKY: readonly SkyKey[] = [
  { h: 0, top: hex(0x070b18), horizon: hex(0x141c33), sun: hex(0x6d7fb8) },
  { h: 5.2, top: hex(0x0e1530), horizon: hex(0x2c2f52), sun: hex(0x8a86b8) },
  { h: 6.6, top: hex(0x4a6a9e), horizon: hex(0xf2a46b), sun: hex(0xffb070) },
  { h: 8.5, top: hex(0x6f9fd6), horizon: hex(0xcfe0ee), sun: hex(0xffe2bd) },
  { h: 13, top: hex(0x5f95d8), horizon: hex(0xd8e8f4), sun: hex(0xfff3e2) },
  { h: 17.2, top: hex(0x6a8fc6), horizon: hex(0xf0d3ae), sun: hex(0xffd29a) },
  { h: 19.2, top: hex(0x3c4a7c), horizon: hex(0xf08a5a), sun: hex(0xff9056) },
  { h: 20.6, top: hex(0x111a38), horizon: hex(0x3a2f52), sun: hex(0x8a7fb0) },
  { h: 24, top: hex(0x070b18), horizon: hex(0x141c33), sun: hex(0x6d7fb8) },
];

export const SUNRISE = 6.4;
export const SUNSET = 19.8;
export const TANK_ON = 9;
export const TANK_OFF = 21;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (edge0: number, edge1: number, v: number) => {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const wrapHour = (hour: number) => ((hour % 24) + 24) % 24;

/** Hours since local midnight, including fractions. */
export const hourFromDate = (date: Date) =>
  date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

const sampleSky = (hour: number) => {
  for (let i = 0; i < SKY.length - 1; i++) {
    const a = SKY[i]!;
    const b = SKY[i + 1]!;
    if (hour >= a.h && hour <= b.h) {
      const t = smooth(0, 1, (hour - a.h) / (b.h - a.h));
      return {
        top: mix(a.top, b.top, t),
        horizon: mix(a.horizon, b.horizon, t),
        sun: mix(a.sun, b.sun, t),
      };
    }
  }
  const last = SKY[SKY.length - 1]!;
  return { top: last.top, horizon: last.horizon, sun: last.sun };
};

/** Pure lighting model for a given local hour; the scene maps this onto lights and materials. */
export const lightingAt = (rawHour: number): Lighting => {
  const hour = wrapHour(rawHour);
  const sky = sampleSky(hour);

  // Sun arc: 0 at sunrise, 1 at sunset. It enters through the window on the left wall.
  const arc = clamp01((hour - SUNRISE) / (SUNSET - SUNRISE));
  const elevation = Math.sin(arc * Math.PI) * 0.95 + 0.08;
  const sweep = (arc - 0.5) * 1.6;
  const dx = Math.cos(elevation) * Math.cos(sweep);
  const dz = Math.cos(elevation) * Math.sin(sweep) * 0.8 - 0.25;
  const dy = -Math.sin(elevation);
  const len = Math.hypot(dx, dy, dz);

  const daylight =
    smooth(SUNRISE - 0.6, SUNRISE + 1.2, hour) * (1 - smooth(SUNSET - 1.2, SUNSET + 0.5, hour));
  const evening = smooth(16.5, 18.5, hour) * (1 - smooth(23.4, 23.9, hour));
  const tankRamp =
    smooth(TANK_ON - 0.75, TANK_ON + 0.25, hour) *
    (1 - smooth(TANK_OFF - 0.5, TANK_OFF + 0.25, hour));
  const night = 1 - tankRamp;

  return {
    sunDirection: [dx / len, dy / len, dz / len],
    sunColor: sky.sun,
    sunIntensity: 0.15 + daylight * 3.2,
    skyTop: sky.top,
    skyHorizon: sky.horizon,
    ambientColor: mix(hex(0x48506e), mix(sky.horizon, hex(0xfff4e6), 0.5), daylight),
    ambientIntensity: 0.12 + daylight * 0.55,
    lamp: Math.max(evening, (1 - daylight) * smooth(6, 6.5, hour) * (1 - smooth(8, 9, hour)) * 0.6),
    tankLight: tankRamp,
    moonLight: night,
    fishActivity: 0.3 + tankRamp * 0.7,
  };
};
