import { useMemo } from 'react'
import { Color } from 'three'

export const FishModel = ({ color = 'orange' }: { color?: string }) => {
  const fishColor = useMemo(() => new Color(color), [color])

  return (
    <group> 
      {/* Body - Facing +Z */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.6, 4, 8]} />
        <meshStandardMaterial color={fishColor} />
      </mesh>

      {/* Tail - At -Z */}
      <mesh position={[0, 0, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshStandardMaterial color="white" /> 
      </mesh>

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
