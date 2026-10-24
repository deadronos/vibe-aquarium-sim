import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

type TexturesModule = typeof import('../src/scene/textures');

/**
 * A stand-in 2D canvas that records every draw call and style change, so a texture's drawing can
 * be compared run to run without a real canvas implementation.
 */
const fakeCanvas = (log: unknown[]) => {
  const gradient = () => ({ addColorStop: (...args: unknown[]) => log.push(['stop', ...args]) });
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get: (target, key) => {
      if (key in target) return target[key];
      if (key === 'createRadialGradient' || key === 'createLinearGradient')
        return (...args: unknown[]) => (log.push([key, ...args]), gradient());
      return (...args: unknown[]) => log.push([key, ...args]);
    },
    set: (target, key, value) => {
      target[key] = value;
      log.push(['set', key, typeof value === 'object' ? 'gradient' : value]);
      return true;
    },
  });
  return { width: 0, height: 0, getContext: (kind: string) => (kind === '2d' ? ctx : null) };
};

const GENERATORS = [
  ['woodFloorTexture', 1024, 1024, true],
  ['woodGrainTexture', 512, 512, true],
  ['plasterTexture', 512, 512, true],
  ['fabricTexture', 256, 256, true],
  ['rugTexture', 1024, 704, false],
  ['sandTexture', 512, 512, true],
  ['barkTexture', 128, 512, true],
  ['backdropTexture', 256, 128, false],
  ['artTexture', 512, 640, false],
  ['treelineTexture', 1024, 512, false],
] as const;

describe('procedural textures', () => {
  let log: unknown[];
  let canvases: ReturnType<typeof fakeCanvas>[];
  let textures: TexturesModule;

  const load = async () => {
    vi.resetModules();
    return (await import('../src/scene/textures')) as TexturesModule;
  };

  beforeEach(async () => {
    log = [];
    canvases = [];
    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        expect(tag).toBe('canvas');
        const canvas = fakeCanvas(log);
        canvases.push(canvas);
        return canvas;
      },
    });
    textures = await load();
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(GENERATORS)('%s draws a %ix%i canvas texture', (name, width, height, repeat) => {
    const texture = textures[name]();
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    expect(canvases).toHaveLength(1);
    expect(texture.image).toBe(canvases[0]);
    expect(canvases[0]).toMatchObject({ width, height });
    expect(texture.wrapS).toBe(repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping);
    expect(texture.wrapT).toBe(texture.wrapS);
    expect(texture.anisotropy).toBe(8);
    // Colour maps are sRGB; the tree line is an alpha mask and stays linear.
    expect(texture.colorSpace).toBe(
      name === 'treelineTexture' ? THREE.NoColorSpace : THREE.SRGBColorSpace
    );
    expect(texture.version).toBeGreaterThan(0); // flagged for upload
    expect(log.length).toBeGreaterThan(0);
  });

  it.each(GENERATORS)('%s is built once and shared', (name) => {
    const first = textures[name]();
    const calls = log.length;
    expect(textures[name]()).toBe(first);
    expect(log).toHaveLength(calls);
    expect(canvases).toHaveLength(1);
  });

  it.each(GENERATORS)('%s draws the same picture on every page load', async (name) => {
    textures[name]();
    const first = log;
    log = [];
    (await load())[name]();
    expect(log).toEqual(first);
  });

  it('keeps every generator distinct', () => {
    const all = GENERATORS.map(([name]) => textures[name]());
    expect(new Set(all).size).toBe(GENERATORS.length);
  });

  it('paints the rug border on all four sides', () => {
    textures.rugTexture();
    const rects = log.filter((entry) => (entry as unknown[])[0] === 'fillRect') as [
      string,
      number,
      number,
      number,
      number,
    ][];
    expect(rects).toContainEqual(['fillRect', 0, 0, 1024, 64]);
    expect(rects).toContainEqual(['fillRect', 0, 704 - 64, 1024, 64]);
    expect(rects).toContainEqual(['fillRect', 0, 0, 64, 704]);
    expect(rects).toContainEqual(['fillRect', 1024 - 64, 0, 64, 704]);
  });

  it('keeps the plaster speckle near white', () => {
    textures.plasterTexture();
    const styles = log
      .filter((entry) => (entry as unknown[])[1] === 'fillStyle')
      .map((entry) => String((entry as unknown[])[2]));
    expect(styles[0]).toBe('#f4f4f4');
    for (const style of styles.slice(1)) {
      const [r] = /rgba\(([\d.]+)/.exec(style)!.slice(1).map(Number);
      expect(r).toBeGreaterThanOrEqual(225);
      expect(r).toBeLessThanOrEqual(255);
    }
  });
});
