import { Box, Plane } from '@react-three/drei';
import { TANK_DIMENSIONS } from '../config/constants';

export const LivingRoom = () => {
  // Aquarium is centered at [0, 0, 0] with dimensions TANK_DIMENSIONS
  const tankWidth = TANK_DIMENSIONS.width;
  const tankHeight = TANK_DIMENSIONS.height;
  const tankDepth = TANK_DIMENSIONS.depth;

  const roomSize = 10;
  const wallOffset = tankDepth / 2 + 0.5;

  const concreteStandHeight = 0.6;
  const concreteStandWidth = tankWidth + 0.15;
  const concreteStandDepth = tankDepth + 0.15;

  return (
    <group>
      {/* Sleek Concrete Stand / Pedestal */}
      <Box
        args={[concreteStandWidth, concreteStandHeight, concreteStandDepth]}
        position={[0, -tankHeight / 2 - concreteStandHeight / 2, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#dcdcdf" roughness={0.75} metalness={0.05} />
      </Box>

      {/* Hidden cabinet parts */}
      <Box args={[0, 0, 0]} visible={false} />
      <Box args={[0, 0, 0]} visible={false} />

      {/* Dark Back Wall (to receive caustics/subtle light) */}
      <Plane
        args={[roomSize, roomSize]}
        position={[0, 0.25, -wallOffset]}
        rotation={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#020204" roughness={1.0} metalness={0.0} />
      </Plane>

      {/* Side walls and ceiling hidden to match the black void */}
      <Plane args={[roomSize, roomSize]} visible={false} />
      <Plane args={[roomSize, roomSize]} visible={false} />
      <Plane args={[roomSize, roomSize]} visible={false} />

      {/* Dark Floor */}
      <Plane
        args={[roomSize, roomSize]}
        position={[0, -tankHeight / 2 - concreteStandHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#050508" roughness={0.9} />
      </Plane>

      {/* Hide decorations & picture frame */}
      <Box args={[0, 0, 0]} visible={false} />
      <Box args={[0, 0, 0]} visible={false} />
    </group>
  );
};
