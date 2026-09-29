import { describe, expect, it } from 'vitest';

import { causticsFragmentShader, causticsVertexShader } from '../src/shaders/causticsShader';
import { waterFragmentShader, waterVertexShader } from '../src/shaders/waterShader';
import {
  waterSurfaceFragmentShader,
  waterSurfaceVertexShader,
} from '../src/shaders/waterSurfaceShader';
import {
  EPS_CONST_GLSL,
  SAFE_NORMALIZE_GLSL,
  SAFE_NORMALIZE_HIGH_EPS_GLSL,
  SIMPLEX_3D_NOISE_GLSL,
  TONEMAP_COLORSPACE_INCLUDES,
} from '../src/shaders/glsl/common';

const noisedFragments = {
  causticsFragmentShader,
  waterFragmentShader,
};

const safeNormalizeShaders = {
  causticsVertexShader,
  waterVertexShader,
  waterFragmentShader,
  waterSurfaceVertexShader,
  waterSurfaceFragmentShader,
};

const fragmentShaders = {
  causticsFragmentShader,
  waterFragmentShader,
  waterSurfaceFragmentShader,
};

describe('shader chunks (anchor)', () => {
  it('keeps the simplex noise definition and call sites', () => {
    for (const [name, source] of Object.entries(noisedFragments)) {
      expect(source, `${name} should declare snoise`).toContain('float snoise(vec3 v)');
      expect(source, `${name} should call snoise`).toMatch(/snoise\(/);
      expect(source, `${name} should declare permute`).toContain('vec4 permute(vec4 x)');
    }
  });

  it('keeps safeNormalize at every former use site', () => {
    for (const [name, source] of Object.entries(safeNormalizeShaders)) {
      expect(source, `${name} should declare safeNormalize`).toContain(
        'vec3 safeNormalize(vec3 v)'
      );
      expect(source, `${name} should call safeNormalize`).toMatch(/safeNormalize\(/);
    }
  });

  it('ends every fragment shader with the managed tonemap + colorspace includes', () => {
    for (const [name, source] of Object.entries(fragmentShaders)) {
      expect(source, `${name} should include tonemapping`).toContain(
        '#include <tonemapping_fragment>'
      );
      expect(source, `${name} should include colorspace`).toContain(
        '#include <colorspace_fragment>'
      );

      const tonemapIndex = source.indexOf('#include <tonemapping_fragment>');
      const colorspaceIndex = source.indexOf('#include <colorspace_fragment>');
      expect(tonemapIndex, `${name} tonemapping order`).toBeGreaterThan(-1);
      expect(colorspaceIndex, `${name} colorspace order`).toBeGreaterThan(tonemapIndex);

      // No GLSL statements may follow the colorspace include (only the closing brace).
      const tail = source.slice(colorspaceIndex + '#include <colorspace_fragment>'.length);
      expect(tail.replace(/\s|}/g, ''), `${name} trailing content`).toBe('');
    }
  });
});

describe('shared glsl chunks', () => {
  const chunks = {
    EPS_CONST_GLSL,
    SAFE_NORMALIZE_GLSL,
    SAFE_NORMALIZE_HIGH_EPS_GLSL,
    SIMPLEX_3D_NOISE_GLSL,
    TONEMAP_COLORSPACE_INCLUDES,
  };

  it('exports every shared chunk as a non-empty string', () => {
    for (const [name, value] of Object.entries(chunks)) {
      expect(typeof value, `${name} type`).toBe('string');
      expect(value.trim().length, `${name} length`).toBeGreaterThan(0);
    }
  });

  it('contains the expected functions, constants, and includes', () => {
    expect(SIMPLEX_3D_NOISE_GLSL).toContain('float snoise(vec3 v)');
    expect(SIMPLEX_3D_NOISE_GLSL).toContain('vec4 permute(vec4 x)');
    expect(SIMPLEX_3D_NOISE_GLSL).toContain('vec4 taylorInvSqrt(vec4 r)');
    expect(SAFE_NORMALIZE_GLSL).toContain('vec3 safeNormalize(vec3 v)');
    expect(SAFE_NORMALIZE_HIGH_EPS_GLSL).toContain('vec3 safeNormalize(vec3 v)');
    expect(SAFE_NORMALIZE_HIGH_EPS_GLSL).toContain('1e-12');
    expect(EPS_CONST_GLSL).toContain('EPS');
    expect(EPS_CONST_GLSL).toContain('1e-6');
    expect(TONEMAP_COLORSPACE_INCLUDES).toContain('#include <tonemapping_fragment>');
    expect(TONEMAP_COLORSPACE_INCLUDES).toContain('#include <colorspace_fragment>');
  });

  it('preserves each originals epsilon guard', () => {
    const epsOneSix = {
      causticsVertexShader,
      causticsFragmentShader,
      waterVertexShader,
      waterFragmentShader,
    };
    for (const [name, source] of Object.entries(epsOneSix)) {
      expect(source, `${name} should declare EPS=1e-6`).toContain('const float EPS = 1e-6;');
    }

    for (const name of [
      'causticsVertexShader',
      'waterVertexShader',
      'waterFragmentShader',
    ] as const) {
      expect(safeNormalizeShaders[name], `${name} should use EPS guard`).toContain(
        'max(dot(v, v), EPS)'
      );
    }

    for (const name of ['waterSurfaceVertexShader', 'waterSurfaceFragmentShader'] as const) {
      expect(safeNormalizeShaders[name], `${name} should use 1e-12 guard`).toContain(
        'max(dot(v, v), 1e-12)'
      );
      expect(safeNormalizeShaders[name], `${name} should not declare EPS`).not.toContain(
        'const float EPS'
      );
    }
  });
});
