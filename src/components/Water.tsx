import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial, DoubleSide } from 'three';
import { waterVertexShader, waterFragmentShader } from '../shaders/waterShader';

export const Water = () => {
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      waterColor: { value: new Color('#1a4d6d') },
      opacity: { value: 0.3 },
      causticsScale: { value: 2.0 },
      causticsSpeed: { value: 0.5 },
    }),
    []
  );

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
