export const TANK_DIMENSIONS = {
  width: 4,
  height: 2,
  depth: 2,
  wallThickness: 0.012, // ~1/2 inch
  floorThickness: 0.5,
};

export const SIMULATION_BOUNDS = {
  // Safe margins for fish to stay within visually
  x: TANK_DIMENSIONS.width / 2 - 0.3,
  y: TANK_DIMENSIONS.height / 2 - 0.3,
  z: TANK_DIMENSIONS.depth / 2 - 0.3,
};

export const BOIDS_CONFIG = {
  neighborDist: 0.6,
  separationDist: 0.25,
  maxSpeed: 0.4,
  maxForce: 0.5,
};

export const SPECIES_CONFIG = [
  { // Model 0: Neon Tetra (Small, Fast, Tight Schooling)
    maxSpeed: 0.5,
    maxForce: 0.6,
    neighborDist: 0.5,
    separationDist: 0.2,
    weights: { separation: 2.5, alignment: 1.0, cohesion: 1.2 }
  },
  { // Model 1: Goldfish (Medium, Steady)
    maxSpeed: 0.35,
    maxForce: 0.4,
    neighborDist: 0.7,
    separationDist: 0.3,
    weights: { separation: 2.0, alignment: 1.0, cohesion: 1.0 }
  },
  { // Model 2: Betta (Slower, Solitary)
    maxSpeed: 0.25,
    maxForce: 0.3,
    neighborDist: 0.4,
    separationDist: 0.4,
    weights: { separation: 3.0, alignment: 0.5, cohesion: 0.5 }
  }
];
