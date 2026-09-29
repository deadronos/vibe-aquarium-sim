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
  count: number;
}

export const useParticleUniforms = ({
  isWebGPU,
  color,
  pointSize,
  opacity,
  volume,
  drift,
  label,
  count,
}: UseParticleUniformsOptions): ShaderMaterial | null => {
  const timeUniformRef = useRef<{ value: number } | null>(null);

  // `volume`, `isWebGPU`, and `count` mirror the original component's material
  // `useMemo` dependencies so material identity/lifecycle (and the `time`
  // uniform reset to 0) matches the pre-refactor behavior when the particle
  // count changes. `count` is a recreation key only; the material itself does
  // not consume it.
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
  }, [color, count, drift, isWebGPU, label, opacity, pointSize, volume]); // eslint-disable-line react-hooks/exhaustive-deps -- count is an intentional recreation key

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
