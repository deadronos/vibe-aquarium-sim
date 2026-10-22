import { describe, expect, it } from 'vitest';
import { hourFromDate, lightingAt, wrapHour } from '../src/sim/timeOfDay';

describe('lightingAt', () => {
  it('is bright with the tank light on in the afternoon', () => {
    const noon = lightingAt(14);
    expect(noon.sunIntensity).toBeGreaterThan(2.5);
    expect(noon.tankLight).toBeCloseTo(1, 5);
    expect(noon.moonLight).toBeCloseTo(0, 5);
    expect(noon.fishActivity).toBeCloseTo(1, 5);
  });

  it('switches to moonlight, a lamp and sleepy fish late in the evening', () => {
    const late = lightingAt(22.5);
    expect(late.sunIntensity).toBeLessThan(0.3);
    expect(late.tankLight).toBeLessThan(0.01);
    expect(late.moonLight).toBeGreaterThan(0.99);
    expect(late.lamp).toBeGreaterThan(0.9);
    expect(late.fishActivity).toBeLessThan(0.35);
  });

  it('turns the lamp off in the small hours', () => {
    expect(lightingAt(3).lamp).toBeLessThan(0.01);
  });

  it('always returns a unit sun direction pointing downwards', () => {
    for (let h = 0; h < 24; h += 0.5) {
      const [x, y, z] = lightingAt(h).sunDirection;
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
      expect(y).toBeLessThan(0);
    }
  });

  it('changes continuously across the day', () => {
    for (let h = 0; h < 24; h += 0.05) {
      const a = lightingAt(h);
      const b = lightingAt(h + 0.05);
      expect(Math.abs(a.sunIntensity - b.sunIntensity)).toBeLessThan(0.25);
      expect(Math.abs(a.tankLight - b.tankLight)).toBeLessThan(0.15);
    }
  });
});

describe('clock helpers', () => {
  it('wraps hours into 0..24', () => {
    expect(wrapHour(25)).toBeCloseTo(1);
    expect(wrapHour(-1)).toBeCloseTo(23);
  });

  it('reads fractional hours from a date', () => {
    expect(hourFromDate(new Date(2026, 0, 1, 18, 30))).toBeCloseTo(18.5);
  });
});
