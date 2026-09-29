import { describe, it, expect } from 'vitest';

import { TANK_DIMENSIONS } from '../src/config/constants';
import {
  BACKPLATE_Z,
  CAUSTICS_OVERLAY_INSET,
  createCausticsOverlayGeometry,
  createGlassWallGeometry,
} from '../src/components/tank/tankGeometry';

const { width, height, depth, wallThickness } = TANK_DIMENSIONS;

describe('tankGeometry', () => {
  it('merges the four glass walls (back/front/right/left) into one geometry', () => {
    const geometry = createGlassWallGeometry(width, height, depth, wallThickness);

    // BoxGeometry contributes 24 vertices / 36 indices; four merged walls => 96 / 144.
    expect(geometry.getAttribute('position').count).toBe(4 * 24);
    expect(geometry.index?.count).toBe(4 * 36);

    geometry.dispose();
  });

  it('merges the five caustics overlay parts (floor/back/front/right/left)', () => {
    const geometry = createCausticsOverlayGeometry(width, height, depth);

    // PlaneGeometry contributes 4 vertices / 6 indices; five merged planes => 20 / 30.
    expect(geometry.getAttribute('position').count).toBe(5 * 4);
    expect(geometry.index?.count).toBe(5 * 6);

    geometry.dispose();
  });

  it('keeps the caustics overlay back face in front of the backplate', () => {
    expect(BACKPLATE_Z).toBeCloseTo(-depth / 2 + wallThickness * 0.55, 10);
    expect(CAUSTICS_OVERLAY_INSET).toBeGreaterThan(0);

    const geometry = createCausticsOverlayGeometry(width, height, depth);
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const rearZ: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      if (normals.getZ(i) > 0.99) rearZ.push(positions.getZ(i));
    }
    expect(rearZ).toHaveLength(4);
    for (const z of rearZ) expect(z).toBeGreaterThan(BACKPLATE_Z);

    geometry.dispose();
  });
});
