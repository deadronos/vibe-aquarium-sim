import { useFrame } from '@react-three/fiber'
import { world } from '../store'

export const FoodSystem = () => {
  useFrame(() => {
    const food = world.with('food', 'position', 'velocity')

    // Keep loop to avoid unused variable warning if we want to keep the system structure
    // or just comment it out if truly empty.
    // For now, let's just iterate to show intent, but we can remove 'entity' usage if needed.
    for (const _ of food) {
      // Physics handled by Rapier
      // We can add logic here later if we want to despawn food or something
    }
  })
  return null
}
