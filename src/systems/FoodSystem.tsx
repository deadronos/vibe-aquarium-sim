import { useFrame } from '@react-three/fiber'
import { world } from '../store'

export const FoodSystem = () => {
  useFrame(() => {
    const food = world.with('food', 'position', 'velocity')

    // Keep loop to maintain system structure; using entity prevents unused-var lint noise.
    for (const entity of food) {
      void entity
      // Physics handled by Rapier
      // We can add logic here later if we want to despawn food or something
    }
  })
  return null
}
