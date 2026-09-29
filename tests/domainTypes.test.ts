import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Vector3 } from 'three';
import type { BubbleConfig, DecorationType, Vec3Like } from '../src/domain/types';
import type { DecorationType as StoreDecorationType } from '../src/store';
import type { RendererBackend, RendererPreference } from '../src/utils/rendererPolicy';
import type { ShaderLike, ShaderWithProgram } from '../src/utils/shaderDebug';
import type { Float32Buffer, Int32Buffer } from '../src/workers/boids/types';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('shared domain types', () => {
  it('provides the same decoration union to domain and store consumers', () => {
    const shared: DecorationType = 'coral';
    const compatibility: StoreDecorationType = shared;

    expect(compatibility).toBe('coral');
  });

  it('exposes Vec3Like and BubbleConfig from the domain module', () => {
    const domain = read('src/domain/types.ts');
    expect(domain).toMatch(/export type Vec3Like = \{ x: number; y: number; z: number \};/);
    expect(domain).toMatch(/export type BubbleConfig =/);

    expectTypeOf<Vec3Like>().toEqualTypeOf<{ x: number; y: number; z: number }>();
    expectTypeOf<BubbleConfig>().toEqualTypeOf<
      Array<{
        offset: Vector3;
        speed: number;
        phase: number;
        size: number;
        wobble: number;
      }>
    >();

    const point: Vec3Like = { x: 1, y: 2, z: 3 };
    expect(point).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('exposes the canonical renderer backend aliases from rendererPolicy', () => {
    const policy = read('src/utils/rendererPolicy.ts');
    expect(policy).toMatch(/export type RendererBackend = 'webgl' \| 'webgpu';/);
    expect(policy).toMatch(/export type RendererPreference = RendererBackend;/);

    expectTypeOf<RendererBackend>().toEqualTypeOf<'webgl' | 'webgpu'>();
    expectTypeOf<RendererPreference>().toEqualTypeOf<RendererBackend>();

    const backend: RendererBackend = 'webgpu';
    expect(backend).toBe('webgpu');
  });

  it('exposes the canonical shader types from shaderDebug', () => {
    const debug = read('src/utils/shaderDebug.ts');
    expect(debug).toMatch(/export type ShaderLike = \{/);
    expect(debug).toMatch(/export type ShaderWithProgram = ShaderLike;/);

    expectTypeOf<ShaderWithProgram>().toEqualTypeOf<ShaderLike>();
    expectTypeOf<ShaderLike>().toEqualTypeOf<{
      vertexShader: string;
      fragmentShader: string;
      uniforms: Record<string, { value: unknown }>;
    }>();
  });

  it('exposes the canonical boids buffer types from the worker module', () => {
    const workerTypes = read('src/workers/boids/types.ts');
    expect(workerTypes).toMatch(/export type Float32Buffer = Float32Array<ArrayBufferLike>;/);
    expect(workerTypes).toMatch(/export type Int32Buffer = Int32Array<ArrayBufferLike>;/);

    expectTypeOf<Float32Buffer>().toEqualTypeOf<Float32Array<ArrayBufferLike>>();
    expectTypeOf<Int32Buffer>().toEqualTypeOf<Int32Array<ArrayBufferLike>>();
  });

  it('does not redeclare the shared types at the duplicate sites', () => {
    expect(read('src/systems/boids/bufferManager.ts')).not.toMatch(
      /export type (Float32Buffer|Int32Buffer) =/
    );
    expect(read('src/shaders/fishLightingMaterial.ts')).not.toMatch(/type ShaderLike = \{/);
    expect(read('src/components/Tank.tsx')).not.toMatch(/type ShaderWithProgram = \{/);
    expect(read('src/utils/boundaryUtils.ts')).not.toMatch(/export type Vec3Like =/);
    expect(read('src/game/feedingActions.ts')).not.toMatch(/type BubbleConfig =/);
    expect(read('src/performance/qualityProfile.ts')).not.toMatch(/export type RendererBackend =/);
  });
});
