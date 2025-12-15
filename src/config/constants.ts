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
