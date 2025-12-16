# Physics Scale Design (1 unit = 1 meter)

## Tank Dimensions
- **Tank size**: 4m × 2m × 2m (~16,000 liters commercial aquarium)
- **Simulation bounds**: 0.3m margin from walls

## Fish Physics
| Property | Value | Notes |
|----------|-------|-------|
| Collider radius | 0.06m (6cm) | Small fish like goldfish/guppy |
| Mass | 0.05 kg (50g) | Realistic for 6cm fish |
| Linear damping | 0.5 | Water resistance |
| Gravity scale | 0 | Neutral buoyancy |

## Boids Behavior
| Property | Value | Notes |
|----------|-------|-------|
| Neighbor distance | 0.6m | Schooling detection range |
| Separation distance | 0.25m | Personal space |
| Max speed | 0.4 m/s | ~2-4 body lengths/second |
| Max force | 0.5 N | Steering acceleration |

## Food Pellets
| Property | Value | Notes |
|----------|-------|-------|
| Visual radius | 0.015m (1.5cm) | Visible but realistic |
| Collider radius | 0.012m | Slightly smaller than visual |
| Mass | 0.005 kg (5g) | Light pellet |
| Initial sink velocity | 0.08 m/s | Slow drift |
| Gravity scale | 0.15 | Near-neutral buoyancy |
| Linear damping | 3.0 | High water resistance |

## Feeding Behavior
| Property | Value | Notes |
|----------|-------|-------|
| Food detection range | 5m | Fish "smell" food |
| Eating distance | 0.1m (10cm) | Mouth proximity |
| Excitement range | 2m | Fish nearby get excited |
| Excitement duration | 1 second | Speed boost decay |
| Speed boost | +0.15 m/s | Gentle acceleration |

## Water Physics
| Property | Value | Notes |
|----------|-------|-------|
| Density | 1.0 (relative) | Simplified |
| Drag coefficient | 0.3 | Streamlined fish |
| Cross-section area | 0.01 m² | For 6cm fish |
| Current strength | 0.03 N | Gentle procedural flow |

## Effect Sizes
| Effect | Size | Notes |
|--------|------|-------|
| Click ripple | 0.08-0.12m ring | Scales to 1.5m |
| Bubble trail | 4-10mm bubbles | 8 per food |
| Eating burst | 5-9mm particles | 10 particles |
