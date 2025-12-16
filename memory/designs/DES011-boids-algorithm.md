# Boids Algorithm Design

## Overview
Fish use a modified Boids algorithm for natural schooling behavior.

## Classic Forces

### Separation
Avoid crowding neighbors within `separationDist` (25cm).
```
if (distance < separationDist):
    diff = normalize(myPos - neighborPos)
    diff /= distance  # Stronger when closer
    separation += diff
```

### Alignment
Steer towards average heading of neighbors within `neighborDist` (60cm).
```
alignment = average(neighbor.velocity for all neighbors)
alignment = normalize(alignment) * maxSpeed
alignment -= myVelocity
alignment = clamp(alignment, maxForce)
```

### Cohesion
Steer towards center of mass of neighbors.
```
cohesion = average(neighbor.position for all neighbors)
cohesion -= myPosition
cohesion = normalize(cohesion) * maxSpeed
cohesion -= myVelocity
cohesion = clamp(cohesion, maxForce)
```

## Force Weights
```
separation *= 2.0  # Highest priority
alignment  *= 1.0
cohesion   *= 1.0
```

## Boundary Avoidance
Soft steering when approaching tank walls (0.3m margin):
```
if (x < -BOUNDS.x): steer.x += 1
if (x > +BOUNDS.x): steer.x -= 1
// Same for Y, Z
steer = clamp(steer, maxForce * 2)  # Stronger than boids
```

## Food Seeking
When food is within 5m:
- If within 10cm: eat it (remove from world)
- Else: seek with force = `(foodPos - myPos).normalized * maxSpeed * 2`

## Spatial Optimization
Uses `SpatialGrid` for O(1) neighbor queries instead of O(n²).
Cell size = `neighborDist * 2.5` for edge case coverage.

## Fixed Timestep
All boids logic runs on `FixedStepScheduler` at consistent rate for deterministic behavior.
