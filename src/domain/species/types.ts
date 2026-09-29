export type SpeciesId = 'tetra' | 'goldfish' | 'betta';

export interface SpeciesParams {
  maxSpeed: number;
  maxForce: number;
  neighborDist: number;
  separationDist: number;
  weights: {
    separation: number;
    alignment: number;
    cohesion: number;
  };
}

/**
 * A first-class fish species. Species identity is intentionally independent of
 * the render model: `preferredModel` is only the default visual pairing, and
 * `weight` controls the deterministic spawn mix.
 */
export interface SpeciesDefinition {
  id: SpeciesId;
  name: string;
  /** Default render model for this species; may be overridden per entity. */
  preferredModel: 0 | 1 | 2;
  /** Relative spawn weight (not required to sum to 1). */
  weight: number;
  params: SpeciesParams;
}
