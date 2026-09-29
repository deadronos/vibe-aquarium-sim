import type { SpeciesDefinition } from './types';

/** Small, fast, tight schooling fish. Dominant member of the school. */
export const SPECIES_TETRA: SpeciesDefinition = {
  id: 'tetra',
  name: 'Neon Tetra',
  preferredModel: 0,
  weight: 0.6,
  params: {
    maxSpeed: 0.5,
    maxForce: 0.6,
    neighborDist: 0.5,
    separationDist: 0.2,
    weights: { separation: 2.5, alignment: 1.0, cohesion: 1.2 },
  },
};
