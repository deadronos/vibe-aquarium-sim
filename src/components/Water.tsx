import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { CuboidCollider, RigidBody, RapierRigidBody } from '@react-three/rapier'
import { calculateBuoyancyAndDrag } from '../utils/fluidPhysics'

const velocity = new Vector3()
const totalForce = new Vector3()
const gravity = 9.81
// Buoyancy strength 0.2 ensures fish sink naturally but can be lifted by boid steering.
// Values > 0.4 tend to cause unstable "uplift" in this configuration.
const buoyancyStrength = 0.2

// Drag scaling factor (applied as force = -v * factor * mass)
const dragFactor = 2.0

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
    <>
      {/* Physics Sensor Only */}
      <RigidBody type="fixed" colliders={false} position={[0, -0.5, 0]}>
        <CuboidCollider
          args={[5, 2.5, 3]}
          sensor={true}
          isSensor={true}
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
      </RigidBody>

      {/* Visual Only (No Physics) */}
      <mesh position={[0, -0.5, 0]}>
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
    </>
  )
}
