import type { SpeciesParams } from './types';

export function deriveCellSize(species: SpeciesParams[], boids: { neighborDist: number }): number {
  // We use neighborDist for the grid to keep it efficient.
  // Using the largest neighborDist among species or a sensible default.
  let maxNeighborDist = 0;
  for (let s = 0; s < species.length; s++) {
    maxNeighborDist = Math.max(maxNeighborDist, species[s].neighborDist);
  }
  return (maxNeighborDist || boids.neighborDist) * 2.5;
}
