import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial, DoubleSide } from 'three';
import { waterVertexShader, waterFragmentShader } from '../shaders/waterShader';
import { useVisualQuality } from '../performance/VisualQualityContext';

const CAUSTICS_INTENSITY_ENABLED = 0.3;

export const Water = () => {
  const materialRef = useRef<ShaderMaterial>(null);
  const { causticsEnabled } = useVisualQuality();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      waterColor: { value: new Color('#1a4d6d') },
      opacity: { value: 0.3 },
      causticsScale: { value: 2.0 },
      causticsSpeed: { value: 0.5 },
      causticsIntensity: { value: CAUSTICS_INTENSITY_ENABLED },
    }),
    []
  );

  useEffect(() => {
    const nextIntensity = causticsEnabled ? CAUSTICS_INTENSITY_ENABLED : 0;
    if (materialRef.current) {
      materialRef.current.uniforms.causticsIntensity.value = nextIntensity;
    }
  }, [causticsEnabled]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh position={[0, 0, 0]} renderOrder={0}>
      {/* 3.976m x 1.988m x 1.976m */}
      <boxGeometry args={[3.976, 1.988, 1.976]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};
