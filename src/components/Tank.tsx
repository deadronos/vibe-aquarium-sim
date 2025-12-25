import { RigidBody } from '@react-three/rapier';
import { Box, Text, MeshTransmissionMaterial } from '@react-three/drei';
import { BackSide, BoxGeometry } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useMemo } from 'react';

import { TANK_DIMENSIONS } from '../config/constants';
import { useQualityStore } from '../performance/qualityStore';

export const Tank = () => {
  const { width, height, depth, wallThickness, floorThickness } = TANK_DIMENSIONS;

  const transmissionResolution = useQualityStore((s) => s.settings.tankTransmissionResolution);
  const transmissionSamples = useQualityStore((s) => s.settings.tankTransmissionSamples);

  const mergedGeometry = useMemo(() => {
    // Helper to create a box geometry with offset
    const createWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const geo = new BoxGeometry(w, h, d);
      geo.translate(x, y, z);
      return geo;
    };

    const back = createWall(
      width + wallThickness * 2,
      height,
      wallThickness,
      0,
      0,
      -depth / 2 - wallThickness / 2
    );
    const front = createWall(
      width + wallThickness * 2,
      height,
      wallThickness,
      0,
      0,
      depth / 2 + wallThickness / 2
    );
    const right = createWall(wallThickness, height, depth, width / 2 + wallThickness / 2, 0, 0);
    const left = createWall(wallThickness, height, depth, -width / 2 - wallThickness / 2, 0, 0);

    const merged = BufferGeometryUtils.mergeGeometries([back, front, right, left]);
    return merged;
  }, [width, height, depth, wallThickness]);

  return (
    <group>
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
          <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} />
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

      {/* Visual Glass (Single Mesh) */}
      <mesh geometry={mergedGeometry} castShadow receiveShadow>
        <MeshTransmissionMaterial
          color="#aaddff"
          samples={transmissionSamples}
          resolution={transmissionResolution}
          thickness={0.012}
          roughness={0.15}
          chromaticAberration={0.01}
          anisotropy={0.01}
          ior={1.5}
          toneMapped={true}
          side={BackSide}
        />
      </mesh>

      <Text
        position={[0, -height / 2 + 0.2, -depth / 2 + 0.1]}
        fontSize={0.3}
        color="white"
        anchorY="bottom"
      >
        Vibe Aquarium
      </Text>

      <Text
        position={[0, height / 2 - 0.5, -depth / 2 + 0.1]}
        fontSize={0.15}
        color="#aaddff"
        anchorY="top"
        fillOpacity={0.7}
      >
        Click tank to feed fish
      </Text>
    </group>
  );
};
