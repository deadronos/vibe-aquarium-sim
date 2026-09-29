import { SPECIES_TETRA } from './tetra';
import { SPECIES_GOLDFISH } from './goldfish';
import { SPECIES_BETTA } from './betta';
import type { SpeciesDefinition, SpeciesId, SpeciesParams } from './types';

/**
 * Ordered species registry. The array index is the species index sent to the
 * simulation worker, so append new species at the end to keep indices stable.
 */
export const SPECIES_REGISTRY: readonly SpeciesDefinition[] = [
  SPECIES_TETRA,
  SPECIES_GOLDFISH,
  SPECIES_BETTA,
];

/** Worker payload: species params ordered by species index. */
export const SPECIES_PARAMS: SpeciesParams[] = SPECIES_REGISTRY.map((species) => species.params);

const INDEX_BY_ID = new Map<SpeciesId, number>(
  SPECIES_REGISTRY.map((species, index) => [species.id, index])
);

const WEIGHT_TOTAL = SPECIES_REGISTRY.reduce((sum, species) => sum + species.weight, 0);

export function getSpecies(id: SpeciesId): SpeciesDefinition {
  return SPECIES_REGISTRY[speciesIndexFor(id)]!;
}

export function speciesIndexFor(id: SpeciesId | undefined): number {
  if (id === undefined) return 0;
  const index = INDEX_BY_ID.get(id);
  return index === undefined ? 0 : index;
}

export function paramsForSpecies(id: SpeciesId | undefined): SpeciesParams {
  return SPECIES_REGISTRY[speciesIndexFor(id)]!.params;
}

export function speciesForIndex(index: number): SpeciesDefinition {
  if (!Number.isFinite(index)) return SPECIES_REGISTRY[0]!;
  const clamped = Math.min(SPECIES_REGISTRY.length - 1, Math.max(0, Math.floor(index)));
  return SPECIES_REGISTRY[clamped]!;
}

// Low-discrepancy (golden-ratio) sampling keeps the deterministic spawn mix
// well distributed at any school size without a random source.
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

export function weightedSpeciesForIndex(index: number): SpeciesDefinition {
  const fraction = (((index * GOLDEN_RATIO_CONJUGATE) % 1) + 1) % 1;
  const target = fraction * WEIGHT_TOTAL;
  let cumulative = 0;
  for (const species of SPECIES_REGISTRY) {
    cumulative += species.weight;
    if (target < cumulative) return species;
  }
  return SPECIES_REGISTRY[SPECIES_REGISTRY.length - 1]!;
}

export type { SpeciesDefinition, SpeciesId, SpeciesParams };
