import { createRandom } from './random';

/**
 * The gentle care loop: algae films the glass over a few days, plants fill out and fish grow a
 * little over weeks, and every fish has a name. Only timestamps and a seed are stored; everything
 * else is worked out from the clock, so an ignored tank simply reaches a calm steady state.
 */
export interface CareState {
  version: 1;
  /** When this visitor first saw the tank (ms since epoch). */
  since: number;
  /** When the glass was last wiped. */
  wipedAt: number;
  /** Seed for the fish names. */
  nameSeed: number;
}

export const CARE_KEY = 'vibe-aquarium:care';
const DAY_MS = 24 * 60 * 60 * 1000;

/** The heaviest the algae film gets: a soft green haze, never an opaque wall. */
export const ALGAE_MAX = 0.55;
/** Below this the glass looks clean and there is nothing to wipe. */
export const ALGAE_VISIBLE = 0.08;

export const newCare = (now: number, nameSeed: number): CareState => ({
  version: 1,
  since: now,
  wipedAt: now,
  nameSeed: nameSeed >>> 0,
});

const days = (from: number, now: number) => Math.max(0, now - from) / DAY_MS;
const ease = (d: number, tau: number) => 1 - Math.exp(-d / tau);

/** 0..ALGAE_MAX — about a day before it shows, most of the way there in a week. */
export const algaeLevel = (care: CareState, now: number) =>
  ALGAE_MAX * ease(days(care.wipedAt, now), 4);

/** Plant height multiplier: starts as a fresh planting and fills out over a few weeks. */
export const plantGrowth = (care: CareState, now: number) =>
  0.75 + 0.25 * ease(days(care.since, now), 14);

/** Fish size multiplier: young fish grow slightly over the first couple of months. */
export const fishGrowth = (care: CareState, now: number) =>
  0.9 + 0.1 * ease(days(care.since, now), 30);

export const wipeGlass = (care: CareState, now: number): CareState => ({ ...care, wipedAt: now });

const NAMES = [
  'Marlo',
  'Pip',
  'Coral',
  'Biscuit',
  'Juniper',
  'Sunny',
  'Mochi',
  'Basil',
  'Nori',
  'Pebble',
  'Ziggy',
  'Clementine',
  'Wren',
  'Doodle',
  'Fennel',
  'Olive',
  'Bubbles',
  'Tamsin',
  'Kip',
  'Saffron',
  'Remy',
  'Mabel',
  'Gus',
  'Lumi',
  'Pickle',
  'Hazel',
  'Otto',
  'Poppy',
  'Bramble',
  'Tilly',
  'Finn',
  'Maple',
] as const;

/** One distinct name per fish, shuffled by the visitor's seed so every tank has its own cast. */
export const fishNames = (care: CareState, count: number): string[] => {
  const random = createRandom(care.nameSeed);
  const pool: string[] = [...NAMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return Array.from({ length: count }, (_, i) =>
    i < pool.length ? pool[i]! : `${pool[i % pool.length]!} ${Math.floor(i / pool.length) + 1}`
  );
};

const isTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Reads saved care state. Anything missing or malformed starts a fresh tank, and timestamps from
 * the future (a clock that jumped back) are pulled in to now so nothing is stuck.
 */
export const parseCare = (raw: string | null, now: number, nameSeed: number): CareState => {
  if (!raw) return newCare(now, nameSeed);
  try {
    const data = JSON.parse(raw) as Partial<CareState> | null;
    if (
      !data ||
      data.version !== 1 ||
      !isTime(data.since) ||
      !isTime(data.wipedAt) ||
      !isTime(data.nameSeed)
    ) {
      return newCare(now, nameSeed);
    }
    const since = Math.min(data.since, now);
    return {
      version: 1,
      since,
      wipedAt: Math.min(Math.max(data.wipedAt, since), now),
      nameSeed: data.nameSeed >>> 0,
    };
  } catch {
    return newCare(now, nameSeed);
  }
};

/** Minimal storage surface, so tests can pass a plain object instead of `localStorage`. */
export interface CareStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Loads (and saves back, so a first visit is remembered) the care state. Storage may be absent. */
export const loadCare = (storage: CareStorage | null, now: number, nameSeed: number): CareState => {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(CARE_KEY) ?? null;
  } catch {
    // Blocked storage (private mode, disabled cookies): the tank still works, it just forgets.
  }
  const care = parseCare(raw, now, nameSeed);
  saveCare(storage, care);
  return care;
};

export const saveCare = (storage: CareStorage | null, care: CareState) => {
  try {
    storage?.setItem(CARE_KEY, JSON.stringify(care));
  } catch {
    // Full or blocked storage is not worth bothering the visitor about.
  }
};
