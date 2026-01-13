import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial, DoubleSide } from 'three';
import { waterVertexShader, waterFragmentShader } from '../shaders/waterShader';
import { useVisualQuality } from '../performance/VisualQualityContext';
import {
  waterSurfaceFragmentShader,
  waterSurfaceVertexShader,
} from '../shaders/waterSurfaceShader';

const CAUSTICS_INTENSITY_ENABLED = 0.3;
const VOLUME_SPECULAR_STRENGTH_ENABLED = 0.18;
const VOLUME_SHIMMER_STRENGTH_ENABLED = 0.12;

const SURFACE_Y = 1.988 / 2;
const SURFACE_INSET = 0.002;

export const Water = () => {
  const volumeMaterialRef = useRef<ShaderMaterial>(null);
  const surfaceMaterialRef = useRef<ShaderMaterial>(null);

  const { causticsEnabled, waterSurfaceUpgradeEnabled, waterVolumeUpgradeEnabled } =
    useVisualQuality();

  const volumeUniforms = useMemo(
    () => ({
      time: { value: 0 },
      waterColor: { value: new Color('#1a4d6d') },
      opacity: { value: 0.3 },
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
      surfaceTint: { value: new Color('#aaddff') },
      surfaceOpacity: { value: 0.18 },
      surfaceStrength: { value: 0.75 },
      surfaceShimmerStrength: { value: 1.0 },
      surfaceFresnelStrength: { value: 1.0 },
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

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (volumeMaterialRef.current) {
      volumeMaterialRef.current.uniforms.time.value = t;
    }
    if (surfaceMaterialRef.current) {
      surfaceMaterialRef.current.uniforms.time.value = t;
    }
  });

  return (
    <>
      <mesh position={[0, 0, 0]} renderOrder={0}>
        {/* 3.976m x 1.988m x 1.976m */}
        <boxGeometry args={[3.976, 1.988, 1.976]} />
        <shaderMaterial
          ref={volumeMaterialRef}
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={volumeUniforms}
          transparent={true}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {waterSurfaceUpgradeEnabled ? (
        <mesh
          position={[0, SURFACE_Y - SURFACE_INSET, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <planeGeometry args={[3.976, 1.976]} />
          <shaderMaterial
            ref={surfaceMaterialRef}
            vertexShader={waterSurfaceVertexShader}
            fragmentShader={waterSurfaceFragmentShader}
            uniforms={surfaceUniforms}
            transparent={true}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </>
  );
};
