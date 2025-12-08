import { RigidBody } from "@react-three/rapier";
import { Box, Text } from "@react-three/drei";

export const Tank = () => {
  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -10, 0]} restitution={0.2} friction={1}>
        <Box args={[30, 1, 30]}>
           <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} />
        </Box>
      </RigidBody>

      {/* Ceiling */}
      <RigidBody type="fixed" position={[0, 10, 0]}>
         <Box args={[30, 1, 30]} visible={false} />
      </RigidBody>

      {/* Walls */}
      <RigidBody type="fixed" position={[0, 0, 15]}>
         <Box args={[30, 20, 1]}>
             <meshStandardMaterial color="#aaddff" transparent opacity={0.1} />
         </Box>
      </RigidBody>

      <RigidBody type="fixed" position={[0, 0, -15]}>
         <Box args={[30, 20, 1]}>
            <meshStandardMaterial color="#aaddff" transparent opacity={0.1} />
         </Box>
      </RigidBody>

      <RigidBody type="fixed" position={[15, 0, 0]}>
         <Box args={[1, 20, 30]}>
            <meshStandardMaterial color="#aaddff" transparent opacity={0.1} />
         </Box>
      </RigidBody>

      <RigidBody type="fixed" position={[-15, 0, 0]}>
         <Box args={[1, 20, 30]}>
            <meshStandardMaterial color="#aaddff" transparent opacity={0.1} />
         </Box>
      </RigidBody>

      <Text position={[0, 5, -14]} fontSize={1} color="white">
        Vibe Aquarium
      </Text>
    </group>
  )
}
