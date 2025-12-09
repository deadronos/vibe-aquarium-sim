import { RigidBody } from '@react-three/rapier';
import { Box, Text, MeshTransmissionMaterial } from '@react-three/drei';
import { BackSide } from 'three';

export const Tank = () => {
  // Tank Dimensions: 4m wide, 2m high, 2m deep
  // Extents: X[-2, 2], Y[-1, 1], Z[-1, 1]
  const width = 4;
  const height = 2;
  const depth = 2;
  const thickness = 0.5;
  // Thin glass walls (meters) — 0.012 is approximately 1/2 inch
  const wallThickness = 0.012;

  return (
    <group>
      {/* Floor */}
      <RigidBody
        type="fixed"
        position={[0, -height / 2 - thickness / 2, 0]}
        restitution={0.2}
        friction={1}
      >
        <Box args={[width + thickness * 2, thickness, depth + thickness * 2]} receiveShadow>
          <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} />
        </Box>
      </RigidBody>

      {/* Ceiling (Invisible barrier) */}
      <RigidBody type="fixed" position={[0, height / 2 + thickness / 2, 0]}>
        <Box args={[width, thickness, depth]} visible={false} />
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
            chromaticAberration={0.02}
            anisotropy={0.1}
            ior={1.1}
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
            chromaticAberration={0.02}
            anisotropy={0.1}
            ior={1.1}
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
            chromaticAberration={0.02}
            anisotropy={0.1}
            ior={1.1}
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
            chromaticAberration={0.02}
            anisotropy={0.1}
            ior={1.1}
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
