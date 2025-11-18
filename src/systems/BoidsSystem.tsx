import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { world } from '../store'

const separationWeight = 2.0
const alignmentWeight = 1.0
const cohesionWeight = 1.0
const maxSpeed = 2
const maxForce = 0.05

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
            sep.set(0, 0, 0)
            ali.set(0, 0, 0)
            coh.set(0, 0, 0)
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

            if (count > 0) {
                sep.divideScalar(count).normalize().multiplyScalar(maxSpeed).sub(entity.velocity!).clampLength(0, maxForce)
                ali.divideScalar(count).normalize().multiplyScalar(maxSpeed).sub(entity.velocity!).clampLength(0, maxForce)
                coh.divideScalar(count).sub(entity.position).normalize().multiplyScalar(maxSpeed).sub(entity.velocity!).clampLength(0, maxForce)
            }

            // Apply forces
            entity.velocity!.add(sep.multiplyScalar(separationWeight))
            entity.velocity!.add(ali.multiplyScalar(alignmentWeight))
            entity.velocity!.add(coh.multiplyScalar(cohesionWeight))

            // Seek Food
            const foodEntities = world.with('food', 'position')
            let closestFood = null
            let closestDist = Infinity

            for (const food of foodEntities) {
                const d = entity.position.distanceTo(food.position)
                if (d < closestDist && d < 10) {
                    closestDist = d
                    closestFood = food
                }
            }

            if (closestFood) {
                // Strong force towards food
                v1.copy(closestFood.position).sub(entity.position).normalize().multiplyScalar(maxSpeed).sub(entity.velocity!).clampLength(0, maxForce * 3)
                entity.velocity!.add(v1)
            }

            // Limit speed
            entity.velocity!.clampLength(0, maxSpeed)

            // Note: Position update is now handled by Rapier physics in Fish.tsx
            // We only calculate velocity here.
        }
    })

    return null
}
