import { describe, it, expect } from 'vitest';
import { calculateDragForce, calculateWaterCurrent } from '../src/utils/physicsMath';

describe('physicsMath', () => {
  describe('calculateDragForce', () => {
    const params = {
      density: 1000,
      dragCoefficient: 0.5,
      crossSectionArea: 0.01,
    };

    it('returns zero force for negligible speed', () => {
      const force = calculateDragForce(0, 0, 0, params);
      expect(force).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('calculates drag force opposing motion', () => {
      const vx = 1;
      const vy = 0;
      const vz = 0;
      const force = calculateDragForce(vx, vy, vz, params);

      // Speed squared = 1
      // Drag mag = 0.5 * 1000 * 0.5 * 0.01 * 1 = 2.5
      // Direction = (-1, 0, 0)

      expect(force.x).toBeCloseTo(-2.5);
      expect(force.y).toBeCloseTo(0);
      expect(force.z).toBeCloseTo(0);
    });
  });

  describe('calculateWaterCurrent', () => {
    const params = {
      strength: 2.0,
      frequency1: 0.1,
      frequency2: 0.2,
      spatialScale1: 0.5,
      spatialScale2: 0.5,
    };

    it('returns non-zero current', () => {
      // Just check that it returns something valid for a known input
      const force = calculateWaterCurrent(0, 0, 0, params);
      // Math.sin(0) = 0, Math.cos(0) = 1
      // cx = 0*0.5 + 1*0.5 = 0.5
      // cz = 1*0.5 - 0*0.5 = 0.5
      // Mag = sqrt(0.5^2 + 0.5^2) = sqrt(0.5) approx 0.707
      // Normalized: (0.707, 0.707)
      // Scaled by strength 2.0: (1.414, 1.414)

      // But wait, the math in calculateWaterCurrent is:
      // invCurrent = 1 / sqrt(currentLenSq)
      // currentX *= invCurrent * strength

      // So final magnitude should be strength (2.0)

      expect(force.x).not.toBeNaN();
      expect(force.z).not.toBeNaN();
      const mag = Math.sqrt(force.x * force.x + force.z * force.z);
      expect(mag).toBeCloseTo(2.0);
    });
  });
});
