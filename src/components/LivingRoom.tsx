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
                <meshStandardMaterial
                    color="#1a1a1a" // Dark charcoal
                    roughness={0.7}
                    metalness={0.1}
                />
            </Box>

            {/* Back Wall */}
            <Plane
                args={[roomSize, roomSize]}
                position={[0, 0, -tankDepth / 2 - 0.5]} // A bit behind the tank
                rotation={[0, 0, 0]}
                receiveShadow
            >
                <meshStandardMaterial
                    color="#808080" // Darker greyish wall
                    roughness={0.9}
                />
            </Plane>

            {/* Floor */}
            <Plane
                args={[roomSize, roomSize]}
                position={[0, -tankHeight / 2 - standHeight, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
            >
                <meshStandardMaterial
                    color="#a38c71" // Warm wood-like tone
                    roughness={0.8}
                />
            </Plane>

            {/* Optional: A small potted plant or object next to it */}
            <Box
                args={[0.4, 0.6, 0.4]}
                position={[standWidth / 2 + 0.5, -tankHeight / 2 - standHeight + 0.3, 0]}
                receiveShadow
                castShadow
            >
                <meshStandardMaterial color="#3d5a40" roughness={0.9} />
            </Box>
        </group>
    );
};
