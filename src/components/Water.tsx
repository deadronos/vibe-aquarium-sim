import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { CuboidCollider, RigidBody, RapierRigidBody } from '@react-three/rapier'
import { calculateBuoyancyAndDrag } from '../utils/fluidPhysics'

const velocity = new Vector3()
const totalForce = new Vector3()
const gravity = 9.81

// Water volume placement (keep surface below lid and cover floor)
const waterCenterY = -1
const waterHalfHeight = 2.5
const waterSurfaceY = waterCenterY + waterHalfHeight // y = 1.5

// Physical tuning
const buoyancyStrength = 0.01
const dragFactor = 2.6
const approximateBodyRadius = 0.35 // rough fish radius used to estimate submersion
const surfaceBand = 0.6 // height band near surface where upward force fades
const surfacePressureStrength = 1.5 // downward pressure to avoid sticking to the lid
const surfaceUpwardDamping = 3.0 // extra damping on upward velocity near surface

export const Water = () => {
  const submergedBodies = useRef<Set<RapierRigidBody>>(new Set())

  useFrame(() => {
    for (const body of submergedBodies.current) {
      if (!body) continue

      const mass = body.mass()
      const linvel = body.linvel()
      velocity.set(linvel.x, linvel.y, linvel.z)

      const pos = body.translation()
      const depthToSurface = waterSurfaceY - pos.y
      const submersion = Math.min(
        1,
        Math.max(0, (depthToSurface + approximateBodyRadius) / (approximateBodyRadius * 2))
      )

      calculateBuoyancyAndDrag(
        mass,
        velocity,
        gravity,
        buoyancyStrength,
        dragFactor,
        submersion,
        totalForce
      )

      // Add a downward push when skimming the surface to prevent pogoing on the lid
      if (submersion > 0 && depthToSurface < surfaceBand) {
        const surfaceT = 1 - depthToSurface / surfaceBand
        const surfacePush = mass * gravity * surfacePressureStrength * surfaceT
        totalForce.y -= surfacePush

        // Extra damping for upward velocity right at the surface
        if (velocity.y > 0) {
          totalForce.y -= velocity.y * mass * surfaceUpwardDamping * surfaceT
        }
      }

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
      <mesh position={[0, waterCenterY, 0]}>
        <boxGeometry args={[10, waterHalfHeight * 2, 6]} />
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
