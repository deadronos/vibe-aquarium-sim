import { RigidBody } from '@react-three/rapier';
import { Box, Text, MeshTransmissionMaterial } from '@react-three/drei';
import { BackSide } from 'three';

import { TANK_DIMENSIONS } from '../config/constants';

export const Tank = () => {
  const { width, height, depth, wallThickness, floorThickness } = TANK_DIMENSIONS;

  return (
    <group>
      {/* Floor */}
      <RigidBody
        type="fixed"
        position={[0, -height / 2 - floorThickness / 2, 0]}
        restitution={0.2}
        friction={1}
      >
        <Box args={[width + floorThickness * 2, floorThickness, depth + floorThickness * 2]} receiveShadow>
          <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} />
        </Box>
      </RigidBody>

      {/* Ceiling (Invisible barrier) */}
      <RigidBody type="fixed" position={[0, height / 2 + floorThickness / 2, 0]}>
        <Box args={[width, floorThickness, depth]} visible={false} />
      </RigidBody>

      {/* Back Wall */}
      <RigidBody type="fixed" position={[0, 0, -depth / 2 - wallThickness / 2]}>
        <Box args={[width + wallThickness * 2, height, wallThickness]} receiveShadow>
          <MeshTransmissionMaterial
            color="#aaddff"
            samples={8}
            resolution={1024}
            thickness={0.012}
            roughness={0.15}
            chromaticAberration={0.01}
            anisotropy={0.01}
            ior={1.5}
            toneMapped={true}
            side={BackSide}
          />
        </Box>
      </RigidBody>

      {/* Front Wall */}
      <RigidBody type="fixed" position={[0, 0, depth / 2 + wallThickness / 2]}>
        <Box args={[width + wallThickness * 2, height, wallThickness]} receiveShadow>
          <MeshTransmissionMaterial
            color="#aaddff"
            samples={8}
            resolution={1024}
            thickness={0.012}
            roughness={0.15}
            chromaticAberration={0.01}
            anisotropy={0.01}
            ior={1.5}
            toneMapped={true}
            side={BackSide}
          />
        </Box>
      </RigidBody>

      {/* Right Wall */}
      <RigidBody type="fixed" position={[width / 2 + wallThickness / 2, 0, 0]}>
        <Box args={[wallThickness, height, depth]} receiveShadow>
          <MeshTransmissionMaterial
            color="#aaddff"
            samples={8}
            resolution={1024}
            thickness={0.012}
            roughness={0.15}
            chromaticAberration={0.01}
            anisotropy={0.01}
            ior={1.5}
            toneMapped={true}
            side={BackSide}
          />
        </Box>
      </RigidBody>

      {/* Left Wall */}
      <RigidBody type="fixed" position={[-width / 2 - wallThickness / 2, 0, 0]}>
        <Box args={[wallThickness, height, depth]} receiveShadow>
          <MeshTransmissionMaterial
            color="#aaddff"
            samples={8}
            resolution={1024}
            thickness={0.012}
            roughness={0.15}
            chromaticAberration={0.01}
            anisotropy={0.01}
            ior={1.5}
            toneMapped={true}
            side={BackSide}
          />
        </Box>
      </RigidBody>

      <Text
        position={[0, -height / 2 + 0.2, -depth / 2 + 0.1]}
        fontSize={0.3}
        color="white"
        anchorY="bottom"
      >
        Vibe Aquarium
      </Text>
    </group>
  );
};
