export type FishModel = 0 | 1 | 2;

export interface Species {
  id: 'clownfish' | 'tang' | 'angelfish';
  label: string;
  model: FishModel;
  /** Body length in metres. */
  length: number;
  count: number;
  cruiseSpeed: number;
  maxSpeed: number;
  /** How strongly fish stick to their own kind (0 = loner). */
  schooling: number;
  /** Preferred swimming height as a fraction of the swim volume (0 = floor, 1 = surface). */
  preferredHeight: number;
  /** Tail beats per metre travelled, relative to body length. */
  tailBeat: number;
}

export const SPECIES: readonly Species[] = [
  {
    id: 'clownfish',
    label: 'Clownfish',
    model: 0,
    length: 0.075,
    count: 10,
    cruiseSpeed: 0.075,
    maxSpeed: 0.22,
    schooling: 1,
    preferredHeight: 0.35,
    tailBeat: 1.4,
  },
  {
    id: 'tang',
    label: 'Blue tang',
    model: 1,
    length: 0.12,
    count: 4,
    cruiseSpeed: 0.11,
    maxSpeed: 0.3,
    schooling: 0.45,
    preferredHeight: 0.6,
    tailBeat: 1,
  },
  {
    id: 'angelfish',
    label: 'Angelfish',
    model: 2,
    length: 0.11,
    count: 5,
    cruiseSpeed: 0.055,
    maxSpeed: 0.18,
    schooling: 0.7,
    preferredHeight: 0.55,
    tailBeat: 0.8,
  },
];
