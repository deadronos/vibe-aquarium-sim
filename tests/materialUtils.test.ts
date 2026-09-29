import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const { extendSpy } = vi.hoisted(() => ({ extendSpy: vi.fn() }));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return { ...actual, extend: extendSpy };
});

import { registerNodeMaterial, resolveThreeColor } from '../src/components/materials/materialUtils';

describe('resolveThreeColor', () => {
  it('builds a Three color from a CSS string', () => {
    const resolved = resolveThreeColor('#fff');
    expect(resolved).toBeInstanceOf(THREE.Color);
    expect(resolved.r).toBe(1);
  });

  it('yields independent values for different string and Color inputs', () => {
    const fromString = resolveThreeColor('#ff0000');
    const fromColor = resolveThreeColor(new THREE.Color('#00ff00'));

    expect(fromString).not.toBe(fromColor);
    expect(fromString.r).toBe(1);
    expect(fromColor.g).toBe(1);

    const existing = new THREE.Color('#0000ff');
    expect(resolveThreeColor(existing)).toBe(existing);
  });
});

describe('registerNodeMaterial', () => {
  it('extends the R3F catalogue only once per name', () => {
    const Ctor = class {};

    registerNodeMaterial('TestFooNodeMaterial', Ctor);
    registerNodeMaterial('TestFooNodeMaterial', Ctor);

    expect(extendSpy).toHaveBeenCalledTimes(1);
    expect(extendSpy).toHaveBeenCalledWith({ TestFooNodeMaterial: Ctor });
  });
});
