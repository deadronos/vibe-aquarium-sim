import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, ShaderMaterial } from 'three';

import { logShaderOnce } from '../../utils/shaderDebug';
import { particleFragmentShader, particleVertexShader } from '../../shaders/ambientParticlesShader';

type ParticleUniforms = {
  time: { value: number };
  color: { value: Color };
  opacity: { value: number };
  pointSize: { value: number };
  tankVolume: { value: [number, number, number] };
  driftVelocity: { value: [number, number, number] };
};

export interface UseParticleUniformsOptions {
  isWebGPU: boolean;
  color: string;
  pointSize: number;
  opacity: number;
  volume: { x: number; y: number; z: number };
  drift: [number, number, number];
  label: string;
}

export const useParticleUniforms = ({
  isWebGPU,
  color,
  pointSize,
  opacity,
  volume,
  drift,
  label,
}: UseParticleUniformsOptions): ShaderMaterial | null => {
  const timeUniformRef = useRef<{ value: number } | null>(null);

  const material = useMemo(() => {
    if (isWebGPU) return null;

    const uniforms: ParticleUniforms = {
      tankVolume: { value: [volume.x, volume.y, volume.z] },
      // Drift vector: slight X movement, downward Y movement
      driftVelocity: { value: [drift[0], drift[1], drift[2]] },
      time: { value: 0 },
      color: { value: new Color(color) },
      opacity: { value: opacity },
      pointSize: { value: pointSize },
    };

    const shaderMaterial = new ShaderMaterial({
      uniforms,
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    });
    shaderMaterial.onBeforeCompile = (shader: any) => logShaderOnce(label, shader);

    return shaderMaterial;
  }, [color, drift, isWebGPU, label, opacity, pointSize, volume]);

  useFrame((state: any) => {
    // No time update needed for standard PointsMaterial
    if (isWebGPU) return;

    const t = state.clock?.elapsedTime || performance.now() / 1000;
    if (timeUniformRef.current) timeUniformRef.current.value = t;
  });

  useEffect(() => {
    return () => {
      material?.dispose?.();
    };
  }, [material]);

  useEffect(() => {
    if (isWebGPU) {
      timeUniformRef.current = null;
      return;
    }
    timeUniformRef.current = material?.uniforms?.time ?? null;
  }, [material, isWebGPU]);

  return material;
};
