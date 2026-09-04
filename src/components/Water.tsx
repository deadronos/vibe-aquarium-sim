import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial, DoubleSide } from 'three';
import { waterVertexShader, waterFragmentShader } from '../shaders/waterShader';
import { useVisualQuality } from '../performance/VisualQualityContext';
import {
  waterSurfaceFragmentShader,
  waterSurfaceVertexShader,
} from '../shaders/waterSurfaceShader';
import { TANK_DIMENSIONS } from '../config/constants';
import { AQUARIUM_PALETTE, WATER_MATERIAL } from '../config/artDirection';
import { logShaderOnce } from '../utils/shaderDebug';
import { WaterSurfaceNodeMaterial, WaterVolumeNodeMaterial } from './materials/WaterNodeMaterial';

const CAUSTICS_INTENSITY_ENABLED = WATER_MATERIAL.causticsIntensity;
const VOLUME_SPECULAR_STRENGTH_ENABLED = WATER_MATERIAL.volumeSpecularStrength;
const VOLUME_SHIMMER_STRENGTH_ENABLED = WATER_MATERIAL.volumeShimmerStrength;

export const Water = () => {
  const volumeMaterialRef = useRef<ShaderMaterial>(null);
  const surfaceMaterialRef = useRef<ShaderMaterial>(null);

  const { causticsEnabled, waterSurfaceUpgradeEnabled, waterVolumeUpgradeEnabled, isWebGPU } =
    useVisualQuality();

  const volumeUniforms = useMemo(
    () => ({
      time: { value: 0 },
      waterColor: { value: new Color(AQUARIUM_PALETTE.waterDeep) },
      opacity: { value: WATER_MATERIAL.volumeOpacity },
      causticsScale: { value: 2.0 },
      causticsSpeed: { value: 0.5 },
      causticsIntensity: { value: CAUSTICS_INTENSITY_ENABLED },
      volumeSpecularStrength: { value: 0 },
      volumeShimmerStrength: { value: 0 },
    }),
    []
  );

  const surfaceUniforms = useMemo(
    () => ({
      time: { value: 0 },
      surfaceTint: { value: new Color(AQUARIUM_PALETTE.waterSurface) },
      surfaceOpacity: { value: WATER_MATERIAL.surfaceOpacity },
      surfaceStrength: { value: WATER_MATERIAL.surfaceStrength },
      surfaceShimmerStrength: { value: WATER_MATERIAL.surfaceShimmerStrength },
      surfaceFresnelStrength: { value: WATER_MATERIAL.surfaceFresnelStrength },
    }),
    []
  );

  useEffect(() => {
    const nextIntensity = causticsEnabled ? CAUSTICS_INTENSITY_ENABLED : 0;
    if (volumeMaterialRef.current) {
      volumeMaterialRef.current.uniforms.causticsIntensity.value = nextIntensity;
    }
  }, [causticsEnabled]);

  useEffect(() => {
    const nextSpec = waterVolumeUpgradeEnabled ? VOLUME_SPECULAR_STRENGTH_ENABLED : 0;
    const nextShimmer = waterVolumeUpgradeEnabled ? VOLUME_SHIMMER_STRENGTH_ENABLED : 0;

    if (volumeMaterialRef.current) {
      volumeMaterialRef.current.uniforms.volumeSpecularStrength.value = nextSpec;
      volumeMaterialRef.current.uniforms.volumeShimmerStrength.value = nextShimmer;
    }
  }, [waterVolumeUpgradeEnabled]);

  useFrame((state: any) => {
    const t = state.clock?.elapsedTime || performance.now() / 1000;
    if (volumeMaterialRef.current) {
      volumeMaterialRef.current.uniforms.time.value = t;
    }
    if (surfaceMaterialRef.current) {
      surfaceMaterialRef.current.uniforms.time.value = t;
    }
  });

  // Calculate water dimensions to fit perfectly inside the tank
  const waterWidth = TANK_DIMENSIONS.width - TANK_DIMENSIONS.wallThickness * 2 - 0.002; // Small gap
  const waterDepth = TANK_DIMENSIONS.depth - TANK_DIMENSIONS.wallThickness * 2 - 0.002;
  const waterHeight = TANK_DIMENSIONS.height - 0.002;

  const waterSurfaceY = waterHeight / 2 - 0.002;

  return (
    <>
      <mesh position={[0, 0, 0]} renderOrder={0}>
        <boxGeometry args={[waterWidth, waterHeight, waterDepth]} />
        {isWebGPU ? (
          <WaterVolumeNodeMaterial
            waterColor={AQUARIUM_PALETTE.waterDeep}
            opacity={WATER_MATERIAL.volumeOpacity}
            causticsIntensity={causticsEnabled ? CAUSTICS_INTENSITY_ENABLED : 0}
            volumeSpecularStrength={
              waterVolumeUpgradeEnabled ? VOLUME_SPECULAR_STRENGTH_ENABLED : 0
            }
            volumeShimmerStrength={waterVolumeUpgradeEnabled ? VOLUME_SHIMMER_STRENGTH_ENABLED : 0}
          />
        ) : (
          <shaderMaterial
            ref={volumeMaterialRef}
            vertexShader={waterVertexShader}
            fragmentShader={waterFragmentShader}
            onBeforeCompile={(shader: any) => logShaderOnce('Water/Volume', shader)}
            uniforms={volumeUniforms}
            transparent={true}
            side={DoubleSide}
            depthWrite={false}
          />
        )}
      </mesh>

      {waterSurfaceUpgradeEnabled ? (
        <mesh position={[0, waterSurfaceY, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[waterWidth, waterDepth]} />
          {isWebGPU ? (
            <WaterSurfaceNodeMaterial
              surfaceTint={AQUARIUM_PALETTE.waterSurface}
              surfaceOpacity={WATER_MATERIAL.surfaceOpacity}
              surfaceStrength={WATER_MATERIAL.surfaceStrength}
              surfaceShimmerStrength={WATER_MATERIAL.surfaceShimmerStrength}
              surfaceFresnelStrength={WATER_MATERIAL.surfaceFresnelStrength}
            />
          ) : (
            <shaderMaterial
              ref={surfaceMaterialRef}
              vertexShader={waterSurfaceVertexShader}
              fragmentShader={waterSurfaceFragmentShader}
              onBeforeCompile={(shader: any) => logShaderOnce('Water/Surface', shader)}
              uniforms={surfaceUniforms}
              transparent={true}
              side={DoubleSide}
              depthWrite={false}
            />
          )}
        </mesh>
      ) : null}
    </>
  );
};
