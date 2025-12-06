import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { CuboidCollider, RigidBody, RapierRigidBody } from '@react-three/rapier'
import { calculateBuoyancyAndDrag } from '../utils/fluidPhysics'

const velocity = new Vector3()
const totalForce = new Vector3()
const gravity = 9.81
// Slightly under-neutral buoyancy so fish naturally sink away from the lid.
const buoyancyStrength = 0.9

const dragFactor = 0.2

export const Water = () => {
  const submergedBodies = useRef<Set<RapierRigidBody>>(new Set())

  useFrame(() => {
    for (const body of submergedBodies.current) {
      if (!body) continue

      const mass = body.mass()
      const linvel = body.linvel()
      velocity.set(linvel.x, linvel.y, linvel.z)

      calculateBuoyancyAndDrag(
        mass,
        velocity,
        gravity,
        buoyancyStrength,
        dragFactor,
        totalForce
      )

      body.addForce(totalForce, true)
    }
  })

  return (
    <RigidBody type="fixed" colliders={false} position={[0, -0.5, 0]}>
      {/* Sensor collider for fluid detection */}
      <CuboidCollider
        args={[5, 2.5, 3]}
        sensor={true}
        onIntersectionEnter={(payload) => {
          if (payload.other.rigidBody) {
            submergedBodies.current.add(payload.other.rigidBody)
          }
        }}
        onIntersectionExit={(payload) => {
          if (payload.other.rigidBody) {
            submergedBodies.current.delete(payload.other.rigidBody)
          }
        }}
      />

      {/* Visual representation */}
      <mesh>
        <boxGeometry args={[10, 5, 6]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          thickness={0.5}
          chromaticAberration={0.05}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.1}
          temporalDistortion={0.1}
          iridescence={0.5}
          iridescenceIOR={1}
          iridescenceThicknessRange={[0, 1400]}
          color="#44aaff"
        />
      </mesh>
    </RigidBody>
  )
}
