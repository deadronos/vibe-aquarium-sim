import * as THREE from 'three';
import { useEffect, useMemo } from 'react';

import { TANK_DIMENSIONS } from '../config/constants';
import { AQUARIUM_PALETTE, GLASS_MATERIAL } from '../config/artDirection';

import { useVisualQuality } from '../performance/VisualQualityContext';

import { GlassNodeMaterial } from './materials/GlassNodeMaterial';
import { BACKPLATE_Z, createGlassWallGeometry } from './tank/tankGeometry';
import { TankColliders } from './tank/TankColliders';
import { TankCausticsOverlay } from './tank/TankCausticsOverlay';

export { TankCausticsOverlay } from './tank/TankCausticsOverlay';

export const Tank = () => {
  const { width, height, depth, wallThickness } = TANK_DIMENSIONS;
  const { isWebGPU, tankTransmissionEnabled, tankTransmissionDispersionEnabled } =
    useVisualQuality();
  const useTransmissiveGlass = isWebGPU && tankTransmissionEnabled;

  const mergedGeometry = useMemo(
    () => createGlassWallGeometry(width, height, depth, wallThickness),
    [width, height, depth, wallThickness]
  );

  useEffect(() => {
    return () => {
      mergedGeometry.dispose();
    };
  }, [mergedGeometry]);

  return (
    <group>
      <TankCausticsOverlay />

      {/* Opaque inner backplate gives the water volume a stable deep-teal value. */}
      <mesh position={[0, 0, BACKPLATE_Z]} renderOrder={-1}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={AQUARIUM_PALETTE.waterDeep} roughness={0.92} />
      </mesh>

      <TankColliders />

      {/* Visual Glass (Single Mesh) */}
      <mesh geometry={mergedGeometry} castShadow receiveShadow>
        {useTransmissiveGlass ? (
          <GlassNodeMaterial
            color={AQUARIUM_PALETTE.glassTint}
            roughness={GLASS_MATERIAL.transmissionRoughness}
            transmission={GLASS_MATERIAL.transmission}
            thickness={GLASS_MATERIAL.thickness}
            opacity={1}
            ior={GLASS_MATERIAL.ior}
            chromaticAberration={tankTransmissionDispersionEnabled ? GLASS_MATERIAL.dispersion : 0}
          />
        ) : (
          <meshStandardMaterial
            color={AQUARIUM_PALETTE.glassTint}
            roughness={GLASS_MATERIAL.roughness}
            metalness={0.1}
            transparent
            opacity={GLASS_MATERIAL.standardOpacity}
            depthWrite={false}
            side={THREE.FrontSide}
          />
        )}
      </mesh>
    </group>
  );
};
