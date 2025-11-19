import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { world } from '../store'

const separationWeight = 2.0
const alignmentWeight = 1.0
const cohesionWeight = 1.0
const maxSpeed = 1.0
const maxForce = 0.01
const boundsHalfSize = 5 // Keep fish within -5 to 5
const boundsWeight = 0.5
const hungerThreshold = 50
const hungerRate = 0.05

// Temp vectors to avoid GC
const sep = new Vector3()
const ali = new Vector3()
const coh = new Vector3()
const v1 = new Vector3()

export const BoidsSystem = () => {
    useFrame(() => {
        const entities = world.with('fish', 'position', 'velocity')

        // Simple O(N^2) loop for now (<1000 entities is fine)
        for (const entity of entities) {
            // Initialize steering force if needed
            if (!entity.steeringForce) entity.steeringForce = new Vector3()
            entity.steeringForce.set(0, 0, 0)

            sep.set(0, 0, 0)
            ali.set(0, 0, 0)
            coh.set(0, 0, 0)

            // --- AI & State Machine ---

            // Init props
            if (entity.hunger === undefined) entity.hunger = 0
            if (entity.boredom === undefined) entity.boredom = 0
            if (!entity.state) entity.state = 'roam'

            // Update Hunger
            entity.hunger += hungerRate

            // State Transitions
            if (entity.state === 'roam') {
                if (entity.hunger > hungerThreshold) {
                    entity.state = 'seek'
                }
            } else if (entity.state === 'seek') {
                if (entity.hunger <= 0) {
                    entity.state = 'roam'
                }
            }

            // --- Forces ---

            // 1. Bounds Constraint (Keep in tank)
            // Soft bounds: steer back when getting close to edge
            // Hard bounds: strong push when outside
            const margin = 1.0
            const softFactor = 0.5
            const strongFactor = 2.0

            // X Bounds
            if (Math.abs(entity.position.x) > boundsHalfSize - margin) {
                if (Math.abs(entity.position.x) > boundsHalfSize) {
                    // Outside: Strong force
                    v1.set(-Math.sign(entity.position.x), 0, 0).multiplyScalar(boundsWeight * strongFactor)
                } else {
                    // Inside margin: Soft force
                    // dist from safe zone (bounds - margin)
                    const dist = Math.abs(entity.position.x) - (boundsHalfSize - margin)
                    v1.set(-Math.sign(entity.position.x), 0, 0).multiplyScalar(dist * softFactor)
                }
                entity.steeringForce.add(v1)
            }

            // Y Bounds
            if (Math.abs(entity.position.y) > boundsHalfSize - margin) {
                if (Math.abs(entity.position.y) > boundsHalfSize) {
                    v1.set(0, -Math.sign(entity.position.y), 0).multiplyScalar(boundsWeight * strongFactor)
                } else {
                    const dist = Math.abs(entity.position.y) - (boundsHalfSize - margin)
                    v1.set(0, -Math.sign(entity.position.y), 0).multiplyScalar(dist * softFactor)
                }
                entity.steeringForce.add(v1)
            }

            // Z Bounds
            if (Math.abs(entity.position.z) > boundsHalfSize - margin) {
                if (Math.abs(entity.position.z) > boundsHalfSize) {
                    v1.set(0, 0, -Math.sign(entity.position.z)).multiplyScalar(boundsWeight * strongFactor)
                } else {
                    const dist = Math.abs(entity.position.z) - (boundsHalfSize - margin)
                    v1.set(0, 0, -Math.sign(entity.position.z)).multiplyScalar(dist * softFactor)
                }
                entity.steeringForce.add(v1)
            }

            // Extra floor/ceiling check if needed
            if (entity.position.y > 2) {
                v1.set(0, -1, 0).multiplyScalar(boundsWeight)
                entity.steeringForce.add(v1)
            }

            let count = 0

            for (const other of entities) {
                if (entity === other) continue

                const dist = entity.position.distanceTo(other.position)

                if (dist > 0 && dist < 2) { // Perception radius
                    // Separation
                    v1.copy(entity.position).sub(other.position).normalize().divideScalar(dist)
                    sep.add(v1)

                    // Alignment
                    ali.add(other.velocity!)

                    // Cohesion
                    coh.add(other.position)

                    count++
                }
            }

            // 2. Flocking (Sep/Ali/Coh)
            // Only apply full flocking if roaming. If seeking, reduce cohesion/alignment so they can break away.
            const flockMultiplier = entity.state === 'seek' ? 0.2 : 1.0

            if (count > 0) {
                sep.divideScalar(count).normalize().multiplyScalar(maxSpeed).sub(entity.velocity!).clampLength(0, maxForce)
                ali.divideScalar(count).normalize().multiplyScalar(maxSpeed).sub(entity.velocity!).clampLength(0, maxForce)
                coh.divideScalar(count).sub(entity.position).normalize().multiplyScalar(maxSpeed).sub(entity.velocity!).clampLength(0, maxForce)
            }

            // Accumulate forces into steeringForce
            entity.steeringForce.add(sep.multiplyScalar(separationWeight))
            entity.steeringForce.add(ali.multiplyScalar(alignmentWeight * flockMultiplier))
            entity.steeringForce.add(coh.multiplyScalar(cohesionWeight * flockMultiplier))

            // 3. Seek Food
            if (entity.state === 'seek') {
                const foodEntities = world.with('food', 'position')
                let closestFood = null
                let closestDist = Infinity

                for (const food of foodEntities) {
                    const d = entity.position.distanceTo(food.position)
                    if (d < closestDist) {
                        closestDist = d
                        closestFood = food
                    }
                }

                if (closestFood) {
                    // Strong force towards food
                    v1.copy(closestFood.position).sub(entity.position).normalize().multiplyScalar(maxSpeed).sub(entity.velocity!).clampLength(0, maxForce * 3)
                    entity.steeringForce.add(v1)

                    // Eat food if close
                    if (closestDist < 0.5) {
                        entity.hunger = 0
                        entity.state = 'roam'
                        // Ideally remove food here, but we might need a separate system or method for that.
                        // For now, just reset hunger so they stop seeking this specific piece (or all food).
                        // To actually remove food, we need to modify the world.
                        world.remove(closestFood)
                    }
                }
            }
        }
    })

    return null
}
