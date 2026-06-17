import { Box, Plane } from '@react-three/drei';
import { TANK_DIMENSIONS } from '../config/constants';

export const LivingRoom = () => {
  // Aquarium is centered at [0, 0, 0] with dimensions TANK_DIMENSIONS
  const tankWidth = TANK_DIMENSIONS.width;
  const tankHeight = TANK_DIMENSIONS.height;
  const tankDepth = TANK_DIMENSIONS.depth;

  const standHeight = 1.0;
  const standWidth = tankWidth + 0.2; // Slightly wider than tank
  const standDepth = tankDepth + 0.2;
  const standTopHeight = 0.12;

  const roomSize = 10;
  const wallOffset = tankDepth / 2 + 0.5;
  const sideWallOffset = tankWidth / 2 + 1.35;
  const ceilingY = tankHeight / 2 + 2.35;

  return (
    <group>
      {/* Cabinet / Stand */}
      <Box
        args={[standWidth, standHeight, standDepth]}
        position={[0, -tankHeight / 2 - standHeight / 2, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#221d1d" roughness={0.75} metalness={0.08} />
      </Box>

      <Box
        args={[standWidth + 0.03, standTopHeight, standDepth + 0.03]}
        position={[0, -tankHeight / 2 - standTopHeight / 2, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#4a433f" roughness={0.42} metalness={0.16} />
      </Box>

      <Box
        args={[standWidth - 0.06, 0.18, standDepth - 0.06]}
        position={[0, -tankHeight / 2 - standHeight + 0.12, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#171314" roughness={0.92} metalness={0.02} />
      </Box>

      {/* Back Wall */}
      <Plane
        args={[roomSize, roomSize]}
        position={[0, 0.25, -wallOffset]}
        rotation={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#bfb9b8" roughness={0.96} />
      </Plane>

      <Plane
        args={[roomSize, roomSize]}
        position={[-sideWallOffset, 0.25, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#d8ccb5" roughness={0.94} />
      </Plane>

      <Plane
        args={[roomSize, roomSize]}
        position={[sideWallOffset, 0.25, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#cab39b" roughness={0.9} />
      </Plane>

      <Plane
        args={[roomSize, roomSize]}
        position={[0, ceilingY, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#f2ece4" roughness={0.98} />
      </Plane>

      {/* Floor */}
      <Plane
        args={[roomSize, roomSize]}
        position={[0, -tankHeight / 2 - standHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#c7ad88" roughness={0.84} />
      </Plane>

      <Box
        args={[0.4, 0.6, 0.4]}
        position={[standWidth / 2 + 0.5, -tankHeight / 2 - standHeight + 0.3, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#3d5a40" roughness={0.9} />
      </Box>

      <Box
        args={[1.8, 1.2, 0.04]}
        position={[0, 0.45, -wallOffset + 0.02]}
        receiveShadow
      >
        <meshStandardMaterial color="#a89f9c" emissive="#443a35" emissiveIntensity={0.08} />
      </Box>
    </group>
  );
};
