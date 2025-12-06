import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, Group } from 'three'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import type { Entity } from '../store'
import { FishModel } from './FishModel'

const vec = new Vector3()

export const Fish = ({ entity }: { entity: Entity }) => {
  const rigidBody = useRef<RapierRigidBody>(null)
  const group = useRef<Group>(null)

  // 1. Sync Physics -> ECS (Before Boids)
  // We want to capture the result of the previous frame's physics step (collisions, etc.)
  useFrame(() => {
    if (!rigidBody.current || !entity.velocity) return

    const actualVel = rigidBody.current.linvel()
    entity.velocity.set(actualVel.x, actualVel.y, actualVel.z)

    const pos = rigidBody.current.translation()
    entity.position.set(pos.x, pos.y, pos.z)
  }, -1)

  // 2. Sync ECS -> Physics (After Boids)
  // After BoidsSystem has run (priority 0) and updated entity.velocity, we apply it to physics.
  useFrame(() => {
    if (!rigidBody.current || !entity.velocity || !group.current) return

    rigidBody.current.setLinvel(entity.velocity, true)

    // Visual rotation (face velocity)
    if (entity.velocity.lengthSq() > 0.001) {
      vec.copy(entity.position).add(entity.velocity)
      group.current.lookAt(vec)
    }
  }, 1)

  return (
    <RigidBody
      ref={rigidBody}
      position={entity.position}
      colliders="ball"
      enabledRotations={[false, false, false]}
      friction={0}
      restitution={0.5}
      linearDamping={2}
      gravityScale={0}
      ccd={true}
    >
      <group ref={group}>
        <FishModel />
      </group>
    </RigidBody>
  )
}
