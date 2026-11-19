import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { substrateHeight } from '../src/config/scene';
import {
  writeFishShadowLayout,
  writeFishShadowMatrix,
  writeShadowMatrix,
} from '../src/scene/shadows';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('contact shadows', () => {
  it('places a horizontal shadow on the requested floor footprint', () => {
    const matrix = new THREE.Matrix4();

    writeShadowMatrix(matrix, 1.25, 0.007, -0.4, 2.4, 0.8, Math.PI / 2);

    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, rotation, scale);
    expect(position.toArray()).toEqual([1.25, 0.007, -0.4]);
    expect(scale.toArray()).toEqual([2.4, 0.8, 1]);
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(rotation).y).toBeCloseTo(0, 6);
    expect(new THREE.Vector3(1, 0, 0).applyQuaternion(rotation).z).toBeCloseTo(-1, 6);
  });

  it('projects fish shadows onto sloped sand and fades them with height', () => {
    const near = {
      x: 0,
      y: 0,
      z: 0,
      scaleX: 0,
      scaleZ: 0,
      strength: 0,
      slopeX: 0,
      slopeZ: 0,
    };
    const far = {
      x: 0,
      y: 0,
      z: 0,
      scaleX: 0,
      scaleZ: 0,
      strength: 0,
      slopeX: 0,
      slopeZ: 0,
    };

    writeFishShadowLayout(near, 0.12, 0.09, -0.04, 0.8, 1);
    writeFishShadowLayout(far, 0.12, 0.4, -0.04, 0.8, 1);

    const ground = substrateHeight(0.12, -0.04) + 0.003;
    expect(near.y).toBeCloseTo(ground, 8);
    expect(far.y).toBeCloseTo(ground, 8);
    expect(near.scaleX).toBeGreaterThan(far.scaleX);
    expect(near.scaleZ).toBeGreaterThan(far.scaleZ);
    expect(near.strength).toBeGreaterThan(far.strength);
    expect(far.strength).toBeGreaterThan(0);
    expect(near.x).toBe(0.12);
    expect(near.z).toBe(-0.04);
  });

  it('keeps the full fish shadow footprint tangent to the local sand slope', () => {
    const layout = {
      x: 0,
      y: 0,
      z: 0,
      scaleX: 0,
      scaleZ: 0,
      strength: 0,
      slopeX: 0,
      slopeZ: 0,
    };
    const matrix = new THREE.Matrix4();
    const corner = new THREE.Vector3();
    writeFishShadowLayout(layout, -0.3, 0.2, -0.12, 0.1, 1.1);
    writeFishShadowMatrix(matrix, layout, 0.7);

    let largestGap = 0;
    for (const [x, y] of [
      [-0.5, -0.5],
      [-0.5, 0.5],
      [0.5, -0.5],
      [0.5, 0.5],
    ]) {
      corner.set(x!, y!, 0).applyMatrix4(matrix);
      largestGap = Math.max(
        largestGap,
        Math.abs(corner.y - (substrateHeight(corner.x, corner.z) + 0.003))
      );
    }

    expect(largestGap).toBeLessThan(0.0015);
  });

  it('keeps shadow inputs finite when a fish is clamped below the substrate', () => {
    const output = {
      x: 0,
      y: 0,
      z: 0,
      scaleX: 0,
      scaleZ: 0,
      strength: 0,
      slopeX: 0,
      slopeZ: 0,
    };

    writeFishShadowLayout(output, 0, -10, 0.18, 0.6, 1.2);

    expect(Object.values(output).every(Number.isFinite)).toBe(true);
    expect(output.y).toBeCloseTo(substrateHeight(0, 0.18) + 0.003, 8);
    expect(output.strength).toBeLessThanOrEqual(1);
    expect(output.scaleX).toBeGreaterThan(0);
  });

  it('generates and reuses one non-repeating procedural shadow mask', async () => {
    const addColorStop = vi.fn();
    const createRadialGradient = vi.fn(() => ({ addColorStop }));
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
        createRadialGradient,
        fillRect: vi.fn(),
        fillStyle: '',
      })),
    };
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    const { softShadowTexture } = await import('../src/scene/textures');

    const first = softShadowTexture();
    const second = softShadowTexture();

    expect(first).toBe(second);
    expect(first.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(first.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(first.colorSpace).toBe(THREE.NoColorSpace);
    expect(createRadialGradient).toHaveBeenCalledTimes(1);
    expect(addColorStop).toHaveBeenCalledWith(0, 'rgba(255, 255, 255, 1)');
    expect(addColorStop).toHaveBeenCalledWith(1, 'rgba(0, 0, 0, 0)');
  });
});
