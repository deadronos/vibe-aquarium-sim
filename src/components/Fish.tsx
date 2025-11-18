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

  useFrame(() => {
    if (!rigidBody.current || !entity.velocity || !group.current) return

    // 1. Apply steering force from BoidsSystem
    if (entity.steeringForce) {
      rigidBody.current.applyImpulse(entity.steeringForce, true)
      entity.steeringForce.set(0, 0, 0)
    }

    // 2. CRITICAL: Read the ACTUAL velocity resulting from physics (collisions)
    // If the fish hit a wall, 'actualVel' will be stopped or bounced.
    const actualVel = rigidBody.current.linvel()

    // 3. Update the Entity's velocity to match reality
    // This ensures the Boid logic knows it has been stopped/deflected
    entity.velocity.set(actualVel.x, actualVel.y, actualVel.z)

    // 4. Sync ECS position from RigidBody (physics is the source of truth for position)
    const pos = rigidBody.current.translation()
    entity.position.set(pos.x, pos.y, pos.z)

    // 5. Visual rotation (face velocity)
    if (entity.velocity.lengthSq() > 0.001) {
      vec.copy(entity.position).add(entity.velocity)
      group.current.lookAt(vec)
    }
  })

  return (
    <RigidBody
      ref={rigidBody}
      position={entity.position}
      colliders="ball"
      enabledRotations={[false, false, false]}
      friction={0}
      restitution={0.5}
      linearDamping={2}
      gravityScale={1}
      ccd={true}
    >
      <group ref={group}>
        <FishModel />
      </group>
    </RigidBody>
  )
}
