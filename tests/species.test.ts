import { describe, expect, it } from 'vitest';
import {
  SPECIES_PARAMS,
  SPECIES_REGISTRY,
  getSpecies,
  paramsForSpecies,
  speciesForIndex,
  speciesIndexFor,
  weightedSpeciesForIndex,
} from '../src/domain/species';
import type { SpeciesParams } from '../src/workers/boids/types';
import { SPECIES_CONFIG } from '../src/config/constants';

describe('species registry', () => {
  it('exposes a stable, ordered registry with unique ids and model pairings', () => {
    expect(SPECIES_REGISTRY.map((species) => species.id)).toEqual(['tetra', 'goldfish', 'betta']);
    expect(new Set(SPECIES_REGISTRY.map((species) => species.id)).size).toBe(
      SPECIES_REGISTRY.length
    );
    expect(new Set(SPECIES_REGISTRY.map((species) => species.preferredModel))).toEqual(
      new Set([0, 1, 2])
    );
    const weightTotal = SPECIES_REGISTRY.reduce((sum, species) => sum + species.weight, 0);
    expect(weightTotal).toBeCloseTo(1);
  });

  it('derives the worker-facing params from the registry in index order', () => {
    expect(SPECIES_CONFIG).toBe(SPECIES_PARAMS);
    expect(SPECIES_PARAMS).toEqual(SPECIES_REGISTRY.map((species) => species.params));
    // Worker type compatibility: the shared SpeciesParams shape is reused.
    const params: SpeciesParams = SPECIES_PARAMS[0]!;
    expect(params.maxSpeed).toBeGreaterThan(0);
  });

  it('maps species ids to indices and params with a safe fallback', () => {
    expect(speciesIndexFor('tetra')).toBe(0);
    expect(speciesIndexFor('goldfish')).toBe(1);
    expect(speciesIndexFor('betta')).toBe(2);
    expect(speciesIndexFor(undefined)).toBe(0);
    expect(speciesIndexFor('unknown' as never)).toBe(0);

    expect(paramsForSpecies('tetra').maxSpeed).toBe(0.5);
    expect(paramsForSpecies('betta').maxSpeed).toBe(0.25);
    expect(paramsForSpecies(undefined)).toBe(SPECIES_CONFIG[0]);
    expect(getSpecies('goldfish').name).toBe('Goldfish');
  });

  it('resolves indices to species and clamps invalid input', () => {
    expect(speciesForIndex(0).id).toBe('tetra');
    expect(speciesForIndex(2).id).toBe('betta');
    expect(speciesForIndex(-1).id).toBe('tetra');
    expect(speciesForIndex(99).id).toBe('betta');
    expect(speciesForIndex(Number.NaN).id).toBe('tetra');
  });

  it('produces a deterministic weighted mix close to the configured weights', () => {
    const counts: Record<string, number> = {};
    for (let index = 0; index < 300; index++) {
      const species = weightedSpeciesForIndex(index);
      counts[species.id] = (counts[species.id] ?? 0) + 1;
    }
    expect(counts.tetra).toBeGreaterThan(counts.goldfish!);
    expect(counts.goldfish).toBeGreaterThan(counts.betta!);
    // Golden-ratio sampling should be well within 8% of the target weights.
    expect(Math.abs(counts.tetra! / 300 - 0.6)).toBeLessThan(0.08);
    expect(Math.abs(counts.goldfish! / 300 - 0.25)).toBeLessThan(0.08);
    expect(Math.abs(counts.betta! / 300 - 0.15)).toBeLessThan(0.08);
  });
});
