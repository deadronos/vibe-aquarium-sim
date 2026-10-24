import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALGAE_MAX,
  ALGAE_VISIBLE,
  CARE_KEY,
  algaeLevel,
  fishGrowth,
  fishNames,
  loadCare,
  newCare,
  parseCare,
  plantGrowth,
  saveCare,
  wipeGlass,
} from '../src/sim/care';
import type { CareStorage } from '../src/sim/care';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 1);

const memoryStorage = (): CareStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

describe('care state', () => {
  it('survives a reload', () => {
    const storage = memoryStorage();
    const first = loadCare(storage, T0, 1234);
    const wiped = wipeGlass(first, T0 + 3 * DAY);
    saveCare(storage, wiped);
    const reloaded = loadCare(storage, T0 + 4 * DAY, 9999);
    expect(reloaded).toEqual(wiped);
    expect(fishNames(reloaded, 19)).toEqual(fishNames(first, 19));
  });

  it('remembers a first visit straight away', () => {
    const storage = memoryStorage();
    loadCare(storage, T0, 1);
    expect(JSON.parse(storage.data.get(CARE_KEY)!)).toMatchObject({ since: T0, version: 1 });
  });

  it('starts fresh from missing or malformed data', () => {
    for (const raw of [
      null,
      '',
      'not json',
      'null',
      '{"version":2}',
      '{"version":1,"since":"x"}',
    ]) {
      expect(parseCare(raw, T0, 5)).toEqual(newCare(T0, 5));
    }
  });

  it('pulls timestamps from the future back to now', () => {
    const raw = JSON.stringify({ version: 1, since: T0 + DAY, wipedAt: T0 + 2 * DAY, nameSeed: 3 });
    const care = parseCare(raw, T0, 5);
    expect(care.since).toBe(T0);
    expect(care.wipedAt).toBe(T0);
  });

  it('still works when storage is blocked', () => {
    const blocked: CareStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(loadCare(blocked, T0, 7)).toEqual(newCare(T0, 7));
    expect(loadCare(null, T0, 7)).toEqual(newCare(T0, 7));
  });
});

describe('an ignored tank', () => {
  const care = newCare(T0, 1);
  const years = T0 + 3 * 365 * DAY;

  it('only ever gathers a soft film of algae', () => {
    expect(algaeLevel(care, T0)).toBe(0);
    expect(algaeLevel(care, T0 + 0.25 * DAY)).toBeLessThan(ALGAE_VISIBLE);
    expect(algaeLevel(care, T0 + 2 * DAY)).toBeGreaterThan(ALGAE_VISIBLE);
    expect(algaeLevel(care, years)).toBeLessThanOrEqual(ALGAE_MAX);
    expect(ALGAE_MAX).toBeLessThan(0.6);
  });

  it('lets plants and fish grow to a steady size, never beyond', () => {
    expect(plantGrowth(care, T0)).toBeCloseTo(0.75);
    expect(plantGrowth(care, T0 + 7 * DAY)).toBeGreaterThan(plantGrowth(care, T0));
    expect(plantGrowth(care, years)).toBeLessThanOrEqual(1);
    expect(fishGrowth(care, T0)).toBeCloseTo(0.9);
    expect(fishGrowth(care, T0 + 30 * DAY)).toBeGreaterThan(0.95);
    expect(fishGrowth(care, years)).toBeLessThanOrEqual(1);
  });

  it('has nothing go backwards when the clock does', () => {
    expect(algaeLevel(care, T0 - DAY)).toBe(0);
    expect(plantGrowth(care, T0 - DAY)).toBeCloseTo(0.75);
  });
});

describe('wiping the glass', () => {
  it('clears the algae, which then grows back slowly', () => {
    const dirty = newCare(T0, 1);
    const now = T0 + 10 * DAY;
    const clean = wipeGlass(dirty, now);
    expect(algaeLevel(clean, now)).toBe(0);
    expect(algaeLevel(clean, now + DAY)).toBeLessThan(algaeLevel(dirty, now));
    expect(plantGrowth(clean, now)).toBe(plantGrowth(dirty, now));
  });
});

describe('fish names', () => {
  it('gives every fish its own name', () => {
    const names = fishNames(newCare(T0, 42), 19);
    expect(new Set(names).size).toBe(19);
  });

  it('differs between visitors but is stable for one', () => {
    expect(fishNames(newCare(T0, 1), 19)).toEqual(fishNames(newCare(T0 + DAY, 1), 19));
    expect(fishNames(newCare(T0, 1), 19)).not.toEqual(fishNames(newCare(T0, 2), 19));
  });

  it('still names everyone in a bigger tank', () => {
    expect(new Set(fishNames(newCare(T0, 3), 80)).size).toBe(80);
  });
});

describe('store', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads saved care on start and saves a wipe', async () => {
    const storage = memoryStorage();
    storage.setItem(CARE_KEY, JSON.stringify({ version: 1, since: T0, wipedAt: T0, nameSeed: 77 }));
    vi.stubGlobal('window', { location: { search: '' }, localStorage: storage });
    vi.resetModules();
    const { useAquarium } = await import('../src/state/store');
    expect(useAquarium.getState().care).toMatchObject({ since: T0, nameSeed: 77 });
    useAquarium.getState().wipeGlass();
    const saved = JSON.parse(storage.data.get(CARE_KEY)!);
    expect(saved.wipedAt).toBeGreaterThan(T0);
    expect(saved.nameSeed).toBe(77);
  });
});
