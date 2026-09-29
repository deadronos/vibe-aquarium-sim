import { useEffect, useMemo } from 'react';

import { useVisualQuality } from '../performance/VisualQualityContext';
import { TANK_DIMENSIONS } from '../config/constants';
import { useQualityStore } from '../performance/qualityStore';
import { createParticlesGeometry } from '../shaders/ambientParticlesShader';
import { ParticleLayer } from './particles/ParticleLayer';

const PARTICLE_DRIFT: [number, number, number] = [0.08, -0.05, 0.02];

const AmbientParticlesEnabled = () => {
  const particleMultiplier = useQualityStore((s) => s.settings.effectParticleMultiplier);
  const { isWebGPU } = useVisualQuality();

  // Increased counts for "snow" density
  const nearCount = Math.max(150, Math.floor(400 * particleMultiplier));
  const farCount = Math.max(300, Math.floor(600 * particleMultiplier));

  // Use nearly full tank dimensions for the wrap volume
  // We reduce slightly to ensure they don't clip through walls too obviously if the camera is outside
  const volume = useMemo(
    () => ({
      x: TANK_DIMENSIONS.width * 0.98,
      y: TANK_DIMENSIONS.height * 0.98,
      z: TANK_DIMENSIONS.depth * 0.98,
    }),
    []
  );

  const { nearGeometry, farGeometry } = useMemo(() => {
    const ng = createParticlesGeometry(nearCount, 0x1234abcd, volume);
    const fg = createParticlesGeometry(farCount, 0xdeadbeef, volume);
    return { nearGeometry: ng, farGeometry: fg };
  }, [farCount, nearCount, volume]);

  useEffect(() => {
    return () => {
      nearGeometry.dispose();
      farGeometry.dispose();
    };
  }, [farGeometry, nearGeometry]);

  return (
    <group>
      <ParticleLayer
        geometry={farGeometry}
        color="#eeeeee" // Slightly dimmed
        pointSize={0.04} // Even smaller (was 1.0)
        opacity={0.2}
        volume={volume}
        drift={PARTICLE_DRIFT}
        isWebGPU={isWebGPU}
        label="Particles/Far"
        count={farCount}
      />
      <ParticleLayer
        geometry={nearGeometry}
        color="#ffffff" // Pure white snow
        pointSize={0.06} // Tiny specks (was 1.5)
        opacity={0.4} // Subtle
        volume={volume}
        drift={PARTICLE_DRIFT}
        isWebGPU={isWebGPU}
        label="Particles/Near"
        count={nearCount}
      />
    </group>
  );
};

export const AmbientParticles = () => {
  const { ambientParticlesEnabled } = useVisualQuality();
  return <>{ambientParticlesEnabled ? <AmbientParticlesEnabled /> : null}</>;
};
