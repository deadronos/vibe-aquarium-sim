/**
 * Physics configuration for water simulation.
 *
 * density: Water density (approx 1.0 relative for simulation)
 * dragCoefficient: Drag coefficient (0.3 for streamlined fish)
 * crossSectionArea: Cross-sectional area (0.01 m² for average fish)
 * buoyancyForce: Upward force to counteract gravity (not yet implemented)
 */
export const waterPhysics = {
  density: 1.0,
  dragCoefficient: 0.3,
  crossSectionArea: 0.01,
  buoyancyForce: 0.0,
};
