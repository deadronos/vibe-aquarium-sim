import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EffectsChunkError,
  effectsChunkUrl,
  importEffectsModule,
  isEffectsChunkError,
  newVersionDeployed,
  rewriteEffectsChunkSource,
} from '../src/scene/effectsChunk';
import { useAquarium } from '../src/state/store';

const chunkUrl = new URL('https://example.com/vibe-aquarium-sim/assets/Effects-Dq9AUp6D.js');

const source = [
  'import{r as e}from"./rolldown-runtime-QTnfLwEv.js";',
  'import{a as t}from"./react-Dboqm-dD.js";',
  'import{d as i}from"./r3f-VnUs-C8m.js";',
  'import{t as a}from"./index-D6aLCFvP.js";',
  'import{a as o}from"./postprocessing-CMvSF_Xk.js";',
  'import"./side-effect-abcd.js";',
].join('');

describe('effects chunk retry', () => {
  it('keeps evaluated chunks on their original URLs and cache-busts post-processing', () => {
    const rewritten = rewriteEffectsChunkSource(source, chunkUrl, 2);
    expect(rewritten).toContain(
      'from"https://example.com/vibe-aquarium-sim/assets/rolldown-runtime-QTnfLwEv.js"'
    );
    expect(rewritten).toContain(
      'from"https://example.com/vibe-aquarium-sim/assets/react-Dboqm-dD.js"'
    );
    expect(rewritten).toContain(
      'from"https://example.com/vibe-aquarium-sim/assets/index-D6aLCFvP.js"'
    );
    expect(rewritten).toContain(
      'from"https://example.com/vibe-aquarium-sim/assets/postprocessing-CMvSF_Xk.js?retry=2"'
    );
    expect(rewritten).toContain(
      'import"https://example.com/vibe-aquarium-sim/assets/side-effect-abcd.js"'
    );
    expect(rewritten).not.toContain('from"./');
  });

  it('rewrites a second chunk the same way', () => {
    expect(rewriteEffectsChunkSource(source, chunkUrl, 3)).toContain(
      'postprocessing-CMvSF_Xk.js?retry=3'
    );
    expect(rewriteEffectsChunkSource(source, chunkUrl, 4)).toContain(
      'postprocessing-CMvSF_Xk.js?retry=4'
    );
  });

  it('reads the chunk URL from the failed import', () => {
    const error = new Error(
      'Failed to fetch dynamically imported module: https://example.com/vibe-aquarium-sim/assets/Effects-Dq9AUp6D.js'
    );
    expect(effectsChunkUrl(error)).toBe(
      'https://example.com/vibe-aquarium-sim/assets/Effects-Dq9AUp6D.js'
    );
    expect(effectsChunkUrl(new Error('something else'))).toBeNull();
  });

  it('refuses a chunk whose relative imports it cannot rewrite', () => {
    for (const leftover of [
      'const m=import("./lazy-abcd.js");',
      "import{a}from'../up-abcd.js';",
      'import{a}from"./not-a-js-file";',
    ]) {
      expect(() => rewriteEffectsChunkSource(source + leftover, chunkUrl, 2)).toThrow(
        EffectsChunkError
      );
    }
  });

  it('tells a failed download from an error after the chunk loaded', () => {
    for (const message of [
      'Failed to fetch dynamically imported module: https://example.com/assets/Effects-x.js',
      'error loading dynamically imported module: https://example.com/assets/Effects-x.js',
      'Importing a module script failed.',
    ]) {
      expect(isEffectsChunkError(new TypeError(message))).toBe(true);
    }
    expect(isEffectsChunkError(new EffectsChunkError('Effects chunk responded 404', true))).toBe(
      true
    );
    expect(isEffectsChunkError(new TypeError("Cannot read properties of null (reading 'x')"))).toBe(
      false
    );
    expect(isEffectsChunkError(new Error('Failed to compile shader'))).toBe(false);
  });

  it('reports a retry that cannot reach the network as a retryable download failure', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    try {
      const error: unknown = await importEffectsModule(2, chunkUrl.href).catch((e: unknown) => e);
      expect(isEffectsChunkError(error)).toBe(true);
      expect(error).toMatchObject({ retryable: true });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('effects notice', () => {
  it('keeps High off once a reload is the only way back', () => {
    const store = useAquarium.getState();
    store.setQuality('low');
    store.setEffectsNotice('retry');
    store.setQuality('high');
    expect(useAquarium.getState().quality).toBe('high');

    store.setQuality('low');
    store.setEffectsNotice('reload');
    store.setQuality('high');
    expect(useAquarium.getState().quality).toBe('low');

    // A successful load elsewhere cannot clear it, but a newer deploy can replace it.
    store.setEffectsNotice(null);
    expect(useAquarium.getState().effectsNotice).toBe('reload');
    store.setEffectsNotice('update');
    expect(useAquarium.getState().effectsNotice).toBe('update');
  });
});

describe('effects chunk download', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const respond = (body: string, status = 200) =>
    vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response(body, { status }))
    );

  it('asks for a fresh copy and reports a failed response as retryable', async () => {
    const fetch = respond('', 404);
    vi.stubGlobal('fetch', fetch);
    const error: unknown = await importEffectsModule(3, chunkUrl.href).catch((e: unknown) => e);
    expect(fetch).toHaveBeenCalledWith(`${chunkUrl.href}?retry=3`, { cache: 'no-store' });
    expect(error).toBeInstanceOf(EffectsChunkError);
    expect(error).toMatchObject({ retryable: true, message: 'Effects chunk responded 404' });
  });

  it('refuses a downloaded chunk it cannot rewrite, without retrying', async () => {
    vi.stubGlobal('fetch', respond('import{x}from"../elsewhere.js";'));
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const error: unknown = await importEffectsModule(1, chunkUrl.href).catch((e: unknown) => e);
    expect(error).toMatchObject({ retryable: false });
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('imports the rewritten chunk from a blob URL and always releases it', async () => {
    vi.stubGlobal('fetch', respond(source));
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      blob = b as Blob;
      return 'blob:https://example.com/effects';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    // Node cannot load a blob: module, so the import itself rejects here.
    await expect(importEffectsModule(2, chunkUrl.href)).rejects.toThrow();
    expect(blob!.type).toBe('text/javascript');
    const text = await blob!.text();
    expect(text).toContain('postprocessing-CMvSF_Xk.js?retry=2');
    expect(text).not.toMatch(/from"\.\//);
    expect(revoke).toHaveBeenCalledWith('blob:https://example.com/effects');
  });
});

describe('new deploy detection', () => {
  afterEach(() => vi.unstubAllGlobals());

  const page = (entry: string | null) => {
    vi.stubGlobal('document', {
      querySelector: () => (entry ? { getAttribute: () => entry } : null),
    });
    vi.stubGlobal('window', { location: { pathname: '/vibe-aquarium-sim/' } });
  };

  it('is false without an entry script', async () => {
    page(null);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await newVersionDeployed()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is false while the deployed page still loads this entry', async () => {
    page('/vibe-aquarium-sim/assets/index-AAA.js');
    const fetch = vi.fn(() =>
      Promise.resolve(new Response('<script src="/vibe-aquarium-sim/assets/index-AAA.js">'))
    );
    vi.stubGlobal('fetch', fetch);
    expect(await newVersionDeployed()).toBe(false);
    expect(fetch).toHaveBeenCalledWith('/vibe-aquarium-sim/', { cache: 'no-store' });
  });

  it('is true once the deployed page loads a different entry', async () => {
    page('/vibe-aquarium-sim/assets/index-AAA.js');
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('<script src="/vibe-aquarium-sim/assets/index-BBB.js">'))
    );
    expect(await newVersionDeployed()).toBe(true);
  });

  it('reads network trouble as not stale', async () => {
    page('/vibe-aquarium-sim/assets/index-AAA.js');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 503 })));
    expect(await newVersionDeployed()).toBe(false);
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    expect(await newVersionDeployed()).toBe(false);
  });
});
