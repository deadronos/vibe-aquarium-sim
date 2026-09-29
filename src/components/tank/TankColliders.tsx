import { RigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';

import { TANK_DIMENSIONS } from '../../config/constants';
import { AQUARIUM_PALETTE } from '../../config/artDirection';

export const TankColliders = () => {
  const { width, height, depth, wallThickness, floorThickness } = TANK_DIMENSIONS;

  return (
    <>
      {/* Floor */}
      <RigidBody
        type="fixed"
        position={[0, -height / 2 - floorThickness / 2, 0]}
        restitution={0.2}
        friction={1}
      >
        <Box
          args={[width + floorThickness * 2, floorThickness, depth + floorThickness * 2]}
          receiveShadow
        >
          <meshStandardMaterial
            color={AQUARIUM_PALETTE.standInset}
            roughness={0.94}
            transparent
            opacity={0.96}
          />
        </Box>
      </RigidBody>

      {/* Ceiling (Invisible barrier) */}
      <RigidBody type="fixed" position={[0, height / 2 + floorThickness / 2, 0]}>
        <Box args={[width, floorThickness, depth]} visible={false} />
      </RigidBody>

      {/* Invisible Colliders for Walls (Physics only) */}
      <RigidBody type="fixed" position={[0, 0, -depth / 2 - wallThickness / 2]}>
        <Box args={[width + wallThickness * 2, height, wallThickness]} visible={false} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, 0, depth / 2 + wallThickness / 2]}>
        <Box args={[width + wallThickness * 2, height, wallThickness]} visible={false} />
      </RigidBody>
      <RigidBody type="fixed" position={[width / 2 + wallThickness / 2, 0, 0]}>
        <Box args={[wallThickness, height, depth]} visible={false} />
      </RigidBody>
      <RigidBody type="fixed" position={[-width / 2 - wallThickness / 2, 0, 0]}>
        <Box args={[wallThickness, height, depth]} visible={false} />
      </RigidBody>
    </>
  );
};
