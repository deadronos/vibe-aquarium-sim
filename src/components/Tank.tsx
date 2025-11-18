import { RigidBody } from '@react-three/rapier'

export const Tank = () => {
  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" friction={1}>
        <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 6]} />
          <meshStandardMaterial color="#f0e68c" />
        </mesh>
      </RigidBody>

      {/* Back Wall */}
      <RigidBody type="fixed">
        <mesh position={[0, 0, -3]}>
          <boxGeometry args={[10, 6, 0.2]} />
          <meshPhysicalMaterial 
            transmission={0.9} 
            roughness={0} 
            thickness={0.2} 
            color="#aaddff" 
            transparent 
            opacity={0.5} 
          />
        </mesh>
      </RigidBody>
      
      {/* Front Wall (Invisible physics barrier) */}
      <RigidBody type="fixed">
         <mesh position={[0, 0, 3]} visible={false}>
          <boxGeometry args={[10, 6, 0.2]} />
        </mesh>
      </RigidBody>

      {/* Left Wall */}
      <RigidBody type="fixed">
        <mesh position={[-5, 0, 0]}>
          <boxGeometry args={[0.2, 6, 6]} />
          <meshPhysicalMaterial 
            transmission={0.9} 
            roughness={0} 
            thickness={0.2} 
            color="#aaddff" 
            transparent 
            opacity={0.5} 
          />
        </mesh>
      </RigidBody>

      {/* Right Wall */}
      <RigidBody type="fixed">
        <mesh position={[5, 0, 0]}>
          <boxGeometry args={[0.2, 6, 6]} />
          <meshPhysicalMaterial 
            transmission={0.9} 
            roughness={0} 
            thickness={0.2} 
            color="#aaddff" 
            transparent 
            opacity={0.5} 
          />
        </mesh>
      </RigidBody>
    </group>
  )
}
