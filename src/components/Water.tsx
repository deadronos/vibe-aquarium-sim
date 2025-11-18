import { MeshTransmissionMaterial } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'

export const Water = () => {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, -0.5, 0]}>
      {/* Sensor collider for fluid detection */}
      <CuboidCollider 
        args={[5, 2.5, 3]} 
        sensor={true} 
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
