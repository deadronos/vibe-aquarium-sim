import { Box, Plane } from '@react-three/drei';
import { TANK_DIMENSIONS } from '../config/constants';
import { AQUARIUM_PALETTE } from '../config/artDirection';

export const LivingRoom = () => {
  // Aquarium is centered at [0, 0, 0] with dimensions TANK_DIMENSIONS
  const tankWidth = TANK_DIMENSIONS.width;
  const tankHeight = TANK_DIMENSIONS.height;
  const tankDepth = TANK_DIMENSIONS.depth;

  const standHeight = 1.0;
  const standWidth = tankWidth + 0.2; // Slightly wider than tank
  const standDepth = tankDepth + 0.2;

  const roomSize = 10;

  return (
    <group>
      {/* Cabinet / Stand */}
      <Box
        args={[standWidth, standHeight, standDepth]}
        position={[0, -tankHeight / 2 - standHeight / 2, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color={AQUARIUM_PALETTE.stand} roughness={0.7} metalness={0.1} />
      </Box>

      <Box
        args={[standWidth * 0.82, standHeight * 0.62, standDepth + 0.012]}
        position={[0, -tankHeight / 2 - standHeight * 0.56, standDepth * 0.02]}
        receiveShadow
      >
        <meshStandardMaterial color={AQUARIUM_PALETTE.standInset} roughness={0.82} />
      </Box>

      {/* Back Wall */}
      <Plane
        args={[roomSize, roomSize]}
        position={[0, 0, -tankDepth / 2 - 0.5]} // A bit behind the tank
        rotation={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={AQUARIUM_PALETTE.roomWall} roughness={0.9} />
      </Plane>

      {/* Floor */}
      <Plane
        args={[roomSize, roomSize]}
        position={[0, -tankHeight / 2 - standHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={AQUARIUM_PALETTE.roomFloor} roughness={0.86} />
      </Plane>

      {/* A quiet warm prop helps ground the stand without competing with the tank. */}
      <Box
        args={[0.28, 0.42, 0.28]}
        position={[standWidth / 2 + 0.42, -tankHeight / 2 - standHeight + 0.21, -0.08]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color={AQUARIUM_PALETTE.pot} roughness={0.92} />
      </Box>
    </group>
  );
};
