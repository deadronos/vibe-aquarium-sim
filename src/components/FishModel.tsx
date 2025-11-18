import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group } from 'three'
import type { Entity } from '../store'

export const FishModel = ({ entity, color = 'orange' }: { entity?: Entity, color?: string }) => {
  const fishColor = useMemo(() => new Color(color), [color])
  const tailRef = useRef<Group>(null)

  useFrame((state) => {
    if (!tailRef.current) return
    
    const speed = entity?.velocity?.length() || 0
    tailRef.current.rotation.y = Math.sin(state.clock.elapsedTime * (5 + speed * 5)) * 0.2
  })

  return (
    <group> 
      {/* Body - Facing +Z */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.6, 4, 8]} />
        <meshStandardMaterial color={fishColor} />
      </mesh>

      {/* Tail - At -Z */}
      <group ref={tailRef} position={[0, 0, -0.4]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 0.4, 4]} />
          <meshStandardMaterial color="white" /> 
        </mesh>
      </group>

      {/* Eyes */}
      <mesh position={[0.1, 0.1, 0.25]} >
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-0.1, 0.1, 0.25]} >
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </group>
  )
}
