import { describe, expect, it } from 'vitest';
import { classifyDependencyChunk } from '../src/performance/chunkClassification';

describe('classifyDependencyChunk', () => {
  it.each([
    ['/app/node_modules/@react-three/rapier/dist/index.js', 'rapier'],
    ['C:\\repo\\node_modules\\@dimforge\\rapier3d-compat\\rapier.js', 'rapier'],
    ['/repo/node_modules/@dimforge/rapier3d/compat.js', 'rapier'],
    ['/repo/node_modules/@react-three/rapier-extra/index.js', 'r3f-drei'],
    ['/repo/node_modules/@dimforge/rapier3d-extra/index.js', 'vendor'],
    ['/repo/node_modules/@react-three/fiber/dist/index.js', 'r3f-drei'],
    ['/repo/node_modules/drei/core/index.js', 'r3f-drei'],
    ['/repo/node_modules/three-stdlib/helpers.js', 'r3f-drei'],
    ['/repo/node_modules/three/build/three.module.js', 'vendor'],
    ['/repo/node_modules/miniplex/dist/index.js', 'miniplex'],
    ['/repo/node_modules/zustand/vanilla.js', 'vendor'],
    ['/repo/node_modules/tween/index.js', 'tweening'],
    ['/repo/node_modules/gsap/index.js', 'tweening'],
    ['/repo/node_modules/some-library/index.js', 'vendor'],
    ['/repo/node_modules/outer/node_modules/gsap/index.js', 'tweening'],
  ])('%s -> %s', (id, expected) => {
    expect(classifyDependencyChunk(id)).toBe(expected);
  });

  it.each(['/repo/src/main.tsx', '/repo/public/fish.glb', '/repo/node_modules-ish/file.js'])(
    'returns undefined for app file %s',
    (id) => {
      expect(classifyDependencyChunk(id)).toBeUndefined();
    }
  );
});
