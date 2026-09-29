import type { SpeciesDefinition } from './types';

/** Slower, solitary fish that strongly resists crowding. */
export const SPECIES_BETTA: SpeciesDefinition = {
  id: 'betta',
  name: 'Betta',
  preferredModel: 2,
  weight: 0.15,
  params: {
    maxSpeed: 0.25,
    maxForce: 0.3,
    neighborDist: 0.4,
    separationDist: 0.4,
    weights: { separation: 3.0, alignment: 0.5, cohesion: 0.5 },
  },
};
