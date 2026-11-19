import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { resizeShadowMap } from '../src/scene/shadowMap';
import {
  EFFECT_COMPOSER_OPTIONS,
  FrameProfile,
  shadowMapSizeForQuality,
} from '../src/scene/renderQuality';

describe('render quality', () => {
  it('halves the Lite shadow map while preserving High and Medium detail', () => {
    expect(shadowMapSizeForQuality('low')).toEqual([1024, 1024]);
    expect(shadowMapSizeForQuality('medium')).toEqual([2048, 2048]);
    expect(shadowMapSizeForQuality('high')).toEqual([2048, 2048]);
  });

  it('avoids multisampled composer depth blits that are unstable on software GL', () => {
    expect(EFFECT_COMPOSER_OPTIONS).toEqual({
      depthBuffer: true,
      stencilBuffer: false,
      multisampling: 0,
    });
  });

  it('summarizes sampled frame times without mutating its ring', () => {
    const profile = new FrameProfile(5);
    for (const milliseconds of [10, 12, 14, 16, 100]) {
      profile.record(milliseconds, 20, 1000);
    }
    const snapshot = profile.snapshot('low', 1024);

    expect(snapshot).toEqual({
      quality: 'low',
      shadowMapSize: 1024,
      frames: 5,
      avgFrameMs: 30.4,
      minFrameMs: 10,
      maxFrameMs: 100,
      p95FrameMs: 100,
      fps: 1000 / 30.4,
      drawCalls: 20,
      triangles: 1000,
    });
  });

  it('resets accumulated samples when the measured quality changes', () => {
    const profile = new FrameProfile(5);
    profile.record(100, 1, 10);
    profile.record(100, 1, 10);
    profile.reset();
    profile.record(20, 2, 20);
    expect(profile.snapshot('low', 1024)).toMatchObject({
      frames: 1,
      avgFrameMs: 20,
      drawCalls: 2,
      triangles: 20,
    });
  });

  it('rebuilds an existing shadow target when quality changes resolution', () => {
    const light = new THREE.DirectionalLight();
    const map = new THREE.WebGLRenderTarget(2048, 2048);
    const mapPass = new THREE.WebGLRenderTarget(2048, 2048);
    const renderer = { shadowMap: { needsUpdate: false } };
    light.shadow.map = map;
    light.shadow.mapPass = mapPass;

    resizeShadowMap(light.shadow, renderer.shadowMap, 1024);

    expect(light.shadow.map).toBeNull();
    expect(light.shadow.mapPass).toBeNull();
    expect(light.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    expect(renderer.shadowMap.needsUpdate).toBe(true);
  });
});
