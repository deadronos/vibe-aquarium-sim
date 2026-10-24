import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectsBlocked, formatHour, useAquarium } from '../src/state/store';

const initial = useAquarium.getState();
const store = () => useAquarium.getState();

/** Loads a fresh copy of the store as a page with this query string (and optional canvas probe). */
const loadPage = async (search: string, getContext?: (kind: string) => unknown) => {
  vi.stubGlobal('window', { location: { search } });
  if (getContext) vi.stubGlobal('document', { createElement: () => ({ getContext }) });
  vi.resetModules();
  const module = await import('../src/state/store');
  return module.useAquarium.getState();
};

describe('store defaults', () => {
  it('starts on the sofa, in live time, on High, silent and not ready', () => {
    expect(initial).toMatchObject({
      clockMode: 'live',
      viewpoint: 'sofa',
      ambient: false,
      quality: 'high',
      sound: false,
      ready: false,
      feedRequest: 0,
      fishCount: 0,
      effectsNotice: null,
    });
  });
});

describe('page flags', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts on Lite with ?quality=lite', async () => {
    expect((await loadPage('?quality=lite')).quality).toBe('low');
  });

  it('starts without depth of field with ?quality=medium', async () => {
    expect(await loadPage('?quality=medium')).toMatchObject({
      quality: 'medium',
      qualityCeiling: 'medium',
    });
  });

  it('ignores other quality values', async () => {
    expect((await loadPage('?quality=ultra')).quality).toBe('high');
    expect((await loadPage('')).quality).toBe('high');
  });

  it('starts in ambient mode with ?ambient', async () => {
    expect((await loadPage('?ambient')).ambient).toBe(true);
    expect((await loadPage('?quality=lite&ambient=1')).ambient).toBe(true);
    expect((await loadPage('?quality=lite')).ambient).toBe(false);
  });

  it('reports missing WebGL when no context can be made', async () => {
    expect((await loadPage('', () => null)).loadError).toBe('webgl');
    expect(
      (
        await loadPage('', () => {
          throw new Error('blocked');
        })
      ).loadError
    ).toBe('webgl');
  });

  it('hands the WebGL probe context back', async () => {
    const loseContext = vi.fn();
    const asked: string[] = [];
    const state = await loadPage('', (kind) => {
      asked.push(kind);
      return kind === 'webgl2' ? { getExtension: () => ({ loseContext }) } : null;
    });
    expect(state.loadError).toBeNull();
    expect(asked).toEqual(['webgl2']);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it('falls back to WebGL 1', async () => {
    const asked: string[] = [];
    const state = await loadPage('', (kind) => {
      asked.push(kind);
      return kind === 'webgl' ? { getExtension: () => null } : null;
    });
    expect(state.loadError).toBeNull();
    expect(asked).toEqual(['webgl2', 'webgl']);
  });
});

describe('clock modes', () => {
  beforeEach(() => useAquarium.setState(initial, true));

  it('keeps the shown time when switching to manual', () => {
    store().setDisplayHour(18.25);
    store().setClockMode('manual');
    expect(store()).toMatchObject({ clockMode: 'manual', manualHour: 18.25 });
  });

  it('remembers the manual hour when leaving manual mode', () => {
    store().setManualHour(7);
    store().setDisplayHour(20);
    store().setClockMode('cycle');
    expect(store()).toMatchObject({ clockMode: 'cycle', manualHour: 7 });
    store().setClockMode('live');
    expect(store()).toMatchObject({ clockMode: 'live', manualHour: 7 });
  });

  it('switches to manual when the hour is dragged', () => {
    store().setClockMode('cycle');
    store().setManualHour(3.5);
    expect(store()).toMatchObject({ clockMode: 'manual', manualHour: 3.5 });
  });

  it('publishes the displayed hour without changing the mode', () => {
    store().setDisplayHour(9);
    expect(store()).toMatchObject({ clockMode: 'live', displayHour: 9, manualHour: 14 });
  });
});

describe('quality and post-stack notices', () => {
  beforeEach(() => useAquarium.setState(initial, true));

  it('switches quality and clears any downgrade notice', () => {
    useAquarium.setState({ quality: 'low', qualityDrops: 2, qualityNotice: true });
    store().setQuality('high');
    expect(store()).toMatchObject({ quality: 'high', qualityDrops: 0, qualityNotice: false });
  });

  it.each(['reload', 'update'] as const)('refuses High once the post stack is %s-blocked', (n) => {
    store().setQuality('low');
    store().setEffectsNotice(n);
    store().setQuality('high');
    expect(store().quality).toBe('low');
  });

  it.each(['retry', 'crash'] as const)('still allows High after a %s notice', (n) => {
    store().setQuality('low');
    store().setEffectsNotice(n);
    store().setQuality('high');
    expect(store().quality).toBe('high');
  });

  it('marks only reload and update as blocking', () => {
    expect(effectsBlocked('reload')).toBe(true);
    expect(effectsBlocked('update')).toBe(true);
    expect(effectsBlocked('retry')).toBe(false);
    expect(effectsBlocked('crash')).toBe(false);
    expect(effectsBlocked(null)).toBe(false);
  });

  it('keeps a blocking notice until a newer deploy replaces it', () => {
    store().setEffectsNotice('reload');
    store().setEffectsNotice(null);
    store().setEffectsNotice('retry');
    expect(store().effectsNotice).toBe('reload');
    store().setEffectsNotice('update');
    expect(store().effectsNotice).toBe('update');
    store().setEffectsNotice(null);
    expect(store().effectsNotice).toBe('update');
  });

  it('replaces and clears a non-blocking notice', () => {
    store().setEffectsNotice('retry');
    store().setEffectsNotice('crash');
    expect(store().effectsNotice).toBe('crash');
    store().setEffectsNotice(null);
    expect(store().effectsNotice).toBeNull();
  });
});

describe('simple setters', () => {
  beforeEach(() => useAquarium.setState(initial, true));

  it('changes viewpoint and ambient mode', () => {
    store().setViewpoint('follow');
    store().setAmbient(true);
    expect(store()).toMatchObject({ viewpoint: 'follow', ambient: true });
  });

  it('toggles sound', () => {
    store().toggleSound();
    expect(store().sound).toBe(true);
    store().toggleSound();
    expect(store().sound).toBe(false);
  });

  it('counts feed requests so each one is seen as new', () => {
    store().requestFeed();
    store().requestFeed();
    expect(store().feedRequest).toBe(2);
  });

  it('records the fish count', () => {
    store().setFishCount(18);
    expect(store().fishCount).toBe(18);
  });
});

describe('formatHour', () => {
  it('pads, truncates minutes and wraps at midnight', () => {
    expect(formatHour(0)).toBe('00:00');
    expect(formatHour(7.25)).toBe('07:15');
    expect(formatHour(12.999)).toBe('12:59');
    expect(formatHour(24)).toBe('00:00');
    expect(formatHour(25.5)).toBe('01:30');
  });
});
