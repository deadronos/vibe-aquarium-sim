import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial } from 'three';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';

import { TANK_DIMENSIONS } from '../../config/constants';
import { AQUARIUM_PALETTE, CAUSTICS_MATERIAL } from '../../config/artDirection';

import { useVisualQuality } from '../../performance/VisualQualityContext';

import { causticsFragmentShader, causticsVertexShader } from '../../shaders/causticsShader';
import { logShaderOnce, type ShaderWithProgram } from '../../utils/shaderDebug';
import { TankCausticsNodeMaterial } from '../materials/TankCausticsNodeMaterial';
import { createCausticsOverlayGeometry } from './tankGeometry';

const TankCausticsOverlayEnabled = () => {
  const materialRef = useRef<ShaderMaterial>(null);
  const { width, height, depth } = TANK_DIMENSIONS;
  const { isWebGPU } = useVisualQuality();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      intensity: { value: CAUSTICS_MATERIAL.intensity },
      scale: { value: CAUSTICS_MATERIAL.scale },
      speed: { value: CAUSTICS_MATERIAL.speed },
      color: { value: new Color(AQUARIUM_PALETTE.waterHighlight) },
    }),
    []
  );

  const geometry = useMemo(
    () => createCausticsOverlayGeometry(width, height, depth),
    [depth, height, width]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.time.value =
      (state as { clock?: { elapsedTime: number } }).clock?.elapsedTime ?? performance.now() / 1000;
  });

  return (
    <mesh geometry={geometry}>
      {isWebGPU ? (
        <TankCausticsNodeMaterial
          color={AQUARIUM_PALETTE.waterHighlight}
          intensity={CAUSTICS_MATERIAL.intensity}
          scale={CAUSTICS_MATERIAL.scale}
          speed={CAUSTICS_MATERIAL.speed}
        />
      ) : (
        <shaderMaterial
          ref={materialRef}
          vertexShader={causticsVertexShader}
          fragmentShader={causticsFragmentShader}
          onBeforeCompile={(shader: ShaderWithProgram) => logShaderOnce('Tank/Caustics', shader)}
          uniforms={uniforms}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
        />
      )}
    </mesh>
  );
};

export const TankCausticsOverlay = () => {
  const { causticsEnabled } = useVisualQuality();
  if (!causticsEnabled) return null;
  return <TankCausticsOverlayEnabled />;
};
