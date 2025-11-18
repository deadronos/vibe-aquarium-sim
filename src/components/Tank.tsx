import { RigidBody, CuboidCollider } from '@react-three/rapier'

export const Tank = () => {
  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" friction={1}>
        <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 6]} />
          <meshStandardMaterial color="#f0e68c" />
        </mesh>
        {/* Thicker floor collider */}
        <CuboidCollider args={[5, 0.5, 3]} position={[0, -3.5, 0]} />
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
        {/* Thicker back wall collider */}
        <CuboidCollider args={[5, 3, 0.5]} position={[0, 0, -3.5]} />
      </RigidBody>

      {/* Front Wall (Invisible physics barrier) */}
      <RigidBody type="fixed">
        <mesh position={[0, 0, 3]} visible={false}>
          <boxGeometry args={[10, 6, 0.2]} />
        </mesh>
        {/* Thicker front wall collider */}
        <CuboidCollider args={[5, 3, 0.5]} position={[0, 0, 3.5]} />
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
        {/* Thicker left wall collider */}
        <CuboidCollider args={[0.5, 3, 3]} position={[-5.5, 0, 0]} />
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
        {/* Thicker right wall collider */}
        <CuboidCollider args={[0.5, 3, 3]} position={[5.5, 0, 0]} />
      </RigidBody>

      {/* Top Wall (Water Surface) */}
      <RigidBody type="fixed">
        <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 6]} />
          <meshPhysicalMaterial
            color="#88ccff"
            transparent
            opacity={0.2}
            side={2} // Double side
          />
        </mesh>
        {/* Thicker top wall collider */}
        <CuboidCollider args={[5, 0.5, 3]} position={[0, 3.5, 0]} />
      </RigidBody>
    </group>
  )
}
