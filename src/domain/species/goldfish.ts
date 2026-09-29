import type { SpeciesDefinition } from './types';

/** Medium, steady swimmer with a looser, roomier school. */
export const SPECIES_GOLDFISH: SpeciesDefinition = {
  id: 'goldfish',
  name: 'Goldfish',
  preferredModel: 1,
  weight: 0.25,
  params: {
    maxSpeed: 0.35,
    maxForce: 0.4,
    neighborDist: 0.7,
    separationDist: 0.3,
    weights: { separation: 2.0, alignment: 1.0, cohesion: 1.0 },
  },
};
