import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, Group } from 'three'
import type { Entity } from '../store'
import { FishModel } from './FishModel'

const vec = new Vector3()

export const Fish = ({ entity }: { entity: Entity }) => {
  const group = useRef<Group>(null)

  useFrame(() => {
    if (!group.current || !entity.velocity) return

    // Sync view to data
    group.current.position.copy(entity.position)
    
    // Face velocity
    if (entity.velocity.lengthSq() > 0.001) {
        // Create a rotation looking at (position + velocity)
        vec.copy(entity.position).add(entity.velocity)
        group.current.lookAt(vec)
    }
  })

  return (
    <group ref={group}>
      <FishModel />
    </group>
  )
}
