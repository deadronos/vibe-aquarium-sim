import { useState, useEffect, useCallback } from 'react';
import { Vector3 } from 'three';
import { EatingBurst } from './effects/EatingBurst';
import { addEffectListener, removeEffectListener } from '../utils/effectsBus';
import { useQualityStore } from '../performance/qualityStore';

interface BurstEffect {
  id: string;
  position: Vector3;
  particles?: Array<{ velocity: Vector3; size: number }>;
}

export const EffectsManager = () => {
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const particleMultiplier = useQualityStore((s) => s.settings.effectParticleMultiplier);

  const handleBurst = useCallback(
    (position: Vector3) => {
      const id = `burst-${Date.now()}-${Math.random()}`;
      // Generate particle velocities for the burst at the time of triggering
      const baseCount = 10;
      const particleCount = Math.max(3, Math.round(baseCount * particleMultiplier));
      const particles = Array.from({ length: particleCount }, () => ({
        velocity: new Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        )
          .normalize()
          .multiplyScalar(0.2 + Math.random() * 0.3),
        size: 0.005 + Math.random() * 0.004,
      }));

      setBursts((prev) => [...prev, { id, position, particles }]);
    },
    [particleMultiplier]
  );

  const removeBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Register listener on mount
  useEffect(() => {
    addEffectListener(handleBurst);
    return () => removeEffectListener(handleBurst);
  }, [handleBurst]);

  return (
    <>
      {bursts.map((burst) => (
        <EatingBurst
          key={burst.id}
          position={burst.position}
          particles={burst.particles}
          onComplete={() => removeBurst(burst.id)}
        />
      ))}
    </>
  );
};
