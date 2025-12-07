import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { world } from '../store'

const maxSpeed = 1.2
const maxForce = 13.0

// Tank dimensions (half extents) align with Tank.tsx colliders
const boundsHalfSizeX = 5
const boundsHalfSizeY = 3
const boundsHalfSizeZ = 3
const boundsWeight = 1.0
const boundsMargin = 0.75
const boundsSoftFactor = 2.0
const boundsStrongFactor = 10.0
const waterSurfaceLimit = 1.2

// Depth preference
const preferredDepth = -2.5
const depthAttractStrength = 6.0

// Hunger and state
const hungerThreshold = 50
const hungerRate = 0.05

// Wander behavior
const wanderSpeed = 0.85
const wanderRetargetMin = 1.5
const wanderRetargetMax = 3.5

// Fixed-step integration
const fixedDelta = 1 / 60
const maxSubSteps = 4

// Temp vectors to avoid GC
const temp = new Vector3()
const desiredVel = new Vector3()
const boundsPush = new Vector3()
const depthPull = new Vector3()
const foodDir = new Vector3()
const stepForce = new Vector3()
let accumulator = 0

export const BoidsSystem = () => {
  useFrame((_, delta) => {
    accumulator += delta
    // Clamp accumulator to prevent death spiral on large lag spikes
    if (accumulator > 0.2) accumulator = 0.2
    const subSteps = Math.max(1, Math.min(maxSubSteps, Math.round(accumulator / fixedDelta) || 1))
    accumulator = Math.max(0, accumulator - subSteps * fixedDelta)

    const fish = world.with('fish', 'position', 'velocity')
    const food = world.with('food', 'position')

    // Ensure required components exist
    for (const entity of fish) {
      if (!entity.steeringForce) entity.steeringForce = new Vector3()
      entity.steeringForce.set(0, 0, 0)
      if (!entity.wanderDir) entity.wanderDir = new Vector3()
      if (entity.wanderTimer === undefined) entity.wanderTimer = 0
      if (entity.hunger === undefined) entity.hunger = 0
      if (entity.boredom === undefined) entity.boredom = 0
      if (!entity.state) entity.state = 'roam'
    }

    for (let step = 0; step < subSteps; step++) {
      for (const entity of fish) {
        stepForce.set(0, 0, 0)

        // Hunger/state
        entity.hunger += hungerRate * fixedDelta
        if (entity.state === 'roam' && entity.hunger > hungerThreshold) {
          entity.state = 'seek'
        } else if (entity.state === 'seek' && entity.hunger <= 0) {
          entity.state = 'roam'
        }

        // Bounds push
        if (Math.abs(entity.position.x) > boundsHalfSizeX - boundsMargin) {
          const outside = Math.abs(entity.position.x) > boundsHalfSizeX
          const dist = Math.abs(entity.position.x) - (boundsHalfSizeX - boundsMargin)
          boundsPush
            .set(-Math.sign(entity.position.x), 0, 0)
            .multiplyScalar(
              boundsWeight * (outside ? boundsStrongFactor : dist * boundsSoftFactor)
            )
          stepForce.add(boundsPush)
        }
        if (Math.abs(entity.position.y) > boundsHalfSizeY - boundsMargin) {
          const outside = Math.abs(entity.position.y) > boundsHalfSizeY
          const dist = Math.abs(entity.position.y) - (boundsHalfSizeY - boundsMargin)
          boundsPush
            .set(0, -Math.sign(entity.position.y), 0)
            .multiplyScalar(
              boundsWeight * (outside ? boundsStrongFactor : dist * boundsSoftFactor)
            )
          stepForce.add(boundsPush)
        }
        if (Math.abs(entity.position.z) > boundsHalfSizeZ - boundsMargin) {
          const outside = Math.abs(entity.position.z) > boundsHalfSizeZ
          const dist = Math.abs(entity.position.z) - (boundsHalfSizeZ - boundsMargin)
          boundsPush
            .set(0, 0, -Math.sign(entity.position.z))
            .multiplyScalar(
              boundsWeight * (outside ? boundsStrongFactor : dist * boundsSoftFactor)
            )
          stepForce.add(boundsPush)
        }

        // Surface guard
        if (entity.position.y > waterSurfaceLimit) {
          boundsPush.set(0, -1, 0).multiplyScalar(boundsWeight * boundsStrongFactor)
          stepForce.add(boundsPush)
        }

        // Depth pull toward preferred band
        depthPull.set(0, preferredDepth - entity.position.y, 0).multiplyScalar(depthAttractStrength)
        stepForce.add(depthPull)

        // Wander retarget
        entity.wanderTimer! -= fixedDelta
        if (entity.wanderTimer! <= 0) {
          temp
            .set(Math.random() - 0.5, Math.random() - 0.8, Math.random() - 0.5)
            .normalize()
            .multiplyScalar(wanderSpeed)
          entity.wanderDir!.copy(temp)
          entity.wanderTimer = wanderRetargetMin + Math.random() * (wanderRetargetMax - wanderRetargetMin)
        }

        // Wander steering (match desired velocity)
        desiredVel.copy(entity.wanderDir!)
        temp.copy(desiredVel).sub(entity.velocity!).clampLength(0, maxForce)
        stepForce.add(temp)

        // Food seeking
        if (entity.state === 'seek') {
          let closestFood = null
          let closestDist = Infinity
          for (const f of food) {
            const d = entity.position.distanceTo(f.position)
            if (d < closestDist) {
              closestDist = d
              closestFood = f
            }
          }
          if (closestFood) {
            foodDir.copy(closestFood.position).sub(entity.position).normalize().multiplyScalar(maxSpeed)
            temp.copy(foodDir).sub(entity.velocity!).clampLength(0, maxForce * 2.5)
            stepForce.add(temp)
            if (closestDist < 0.5) {
              entity.hunger = 0
              entity.state = 'roam'
              world.remove(closestFood)
            }
          }
        }

        // Convert per-second force to impulse for fixed step
        stepForce.multiplyScalar(fixedDelta)
        entity.steeringForce.add(stepForce)
      }
    }
  })

  return null
}
