import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { world } from '../store'

const gravity = new Vector3(0, -2, 0)
const temp = new Vector3()

export const FoodSystem = () => {
  useFrame((_, delta) => {
    const food = world.with('food', 'position', 'velocity')
    
    for (const entity of food) {
        // Apply gravity
        entity.velocity!.add(gravity.clone().multiplyScalar(delta))
        
        // Move
        temp.copy(entity.velocity!).multiplyScalar(delta)
        entity.position.add(temp)
        
        // Floor collision
        if (entity.position.y < -2.8) {
            entity.position.y = -2.8
            entity.velocity!.set(0, 0, 0)
        }
    }
  })
  return null
}
