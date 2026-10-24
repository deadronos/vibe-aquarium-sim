import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../src/config/scene';
import { makeUnderwater, waterUniforms } from '../src/scene/tank/underwater';

type Shader = THREE.WebGLProgramParametersWithUniforms;

/** Runs a material's patch against three's real MeshStandardMaterial shader source. */
const compile = (material: THREE.Material) => {
  const shader = {
    uniforms: { diffuse: { value: new THREE.Color() } },
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  } as unknown as Shader;
  material.onBeforeCompile(shader, null as unknown as THREE.WebGLRenderer);
  return shader;
};

describe('underwater material patch', () => {
  it('finds every hook in the standard shader it patches', () => {
    const { vertexShader, fragmentShader } = THREE.ShaderLib.standard;
    for (const hook of [
      '#include <common>',
      '#include <begin_vertex>',
      '#include <project_vertex>',
    ])
      expect(vertexShader).toContain(hook);
    for (const hook of ['#include <common>', '#include <opaque_fragment>'])
      expect(fragmentShader).toContain(hook);
  });

  it('adds depth absorption and shares the water uniforms', () => {
    const material = makeUnderwater(new THREE.MeshStandardMaterial());
    const shader = compile(material);
    expect(shader.vertexShader).toContain('varying vec3 vUwWorld;');
    expect(shader.vertexShader).toContain('vUwWorld = (modelMatrix * uwWorld).xyz;');
    expect(shader.fragmentShader).toContain('vec3 uwAbsorb(vec3 color, vec3 p)');
    expect(shader.fragmentShader).toContain('outgoingLight = uwAbsorb(outgoingLight, vUwWorld);');
    // The opaque output still runs, after the absorption.
    const fragment = shader.fragmentShader;
    expect(fragment.indexOf('#include <opaque_fragment>')).toBeGreaterThan(
      fragment.indexOf('outgoingLight = uwAbsorb')
    );
    expect(fragment).not.toContain('uwCaustic(vUwWorld.xz');
    // Shared by reference, so one per-frame write reaches every material.
    for (const [name, uniform] of Object.entries(waterUniforms))
      expect(shader.uniforms[name]).toBe(uniform);
    expect(shader.uniforms.diffuse).toBeDefined();
  });

  it('adds caustics only when asked', () => {
    const shader = compile(makeUnderwater(new THREE.MeshStandardMaterial(), { caustics: true }));
    expect(shader.fragmentShader).toContain('uwCaustic(vUwWorld.xz, uTime * 0.8)');
    expect(shader.fragmentShader).toContain(TANK.waterLevel.toFixed(3));
  });

  it('injects vertex deformation after the vertex is set up, with its own uniforms', () => {
    const uSway = { value: 0.5 };
    const shader = compile(
      makeUnderwater(new THREE.MeshStandardMaterial(), {
        vertexHead: 'uniform float uSway;',
        vertexDeform: 'transformed.x += uSway;',
        uniforms: { uSway },
      })
    );
    const vertex = shader.vertexShader;
    expect(vertex.indexOf('uniform float uSway;')).toBeLessThan(vertex.indexOf('void main'));
    expect(vertex.indexOf('transformed.x += uSway;')).toBeGreaterThan(
      vertex.indexOf('#include <begin_vertex>')
    );
    expect(vertex.indexOf('transformed.x += uSway;')).toBeLessThan(
      vertex.indexOf('#include <project_vertex>')
    );
    expect(shader.uniforms.uSway).toBe(uSway);
  });

  it('shares a program between matching patches and returns the same material', () => {
    const key = (options?: Parameters<typeof makeUnderwater>[1]) =>
      makeUnderwater(new THREE.MeshStandardMaterial(), options).customProgramCacheKey();
    const material = new THREE.MeshStandardMaterial();
    expect(makeUnderwater(material)).toBe(material);
    // Per-material uniforms do not change the GLSL, so they do not split the program.
    const sway = { vertexHead: 'uniform float uSway;', vertexDeform: 'transformed.x += uSway;' };
    expect(key({ ...sway, uniforms: { uSway: { value: 0.1 } } })).toBe(
      key({ ...sway, uniforms: { uSway: { value: 0.2 } } })
    );
    expect(key({ caustics: true })).toBe(key({ caustics: true }));
    // Different GLSL never shares a program.
    expect(key()).not.toBe(key({ caustics: true }));
    expect(key(sway)).not.toBe(key());
    expect(key(sway)).not.toBe(key({ ...sway, vertexDeform: 'transformed.y += uSway;' }));
    expect(key({ vertexHead: 'a', vertexDeform: 'b' })).not.toBe(key({ vertexHead: 'ab' }));
  });

  it('bounds the water by the tank, from the inner floor to the surface', () => {
    const { uTankMin, uTankMax } = waterUniforms;
    expect(uTankMin.value.toArray()).toEqual([
      TANK_ORIGIN[0] - TANK.width / 2,
      TANK_ORIGIN[1],
      TANK_ORIGIN[2] - TANK.depth / 2,
    ]);
    expect(uTankMax.value.y - uTankMin.value.y).toBeCloseTo(TANK.waterLevel, 9);
    // Red is absorbed fastest, like real water.
    const { x: r, y: g, z: b } = waterUniforms.uAbsorb.value;
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });
});
