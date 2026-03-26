import { useState, useEffect, useCallback } from 'react';
import { Vector3 } from 'three';
import { EatingBurst } from './effects/EatingBurst';
import { addEffectListener, removeEffectListener } from '../utils/effectsBus';
import type { EffectEvent } from '../utils/effectsBus';
import { useQualityStore } from '../performance/qualityStore';

interface BurstEffect {
  id: string;
  position: Vector3;
  particleCount?: number;
}

export const EffectsManager = () => {
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const particleMultiplier = useQualityStore((s) => s.settings.effectParticleMultiplier);

  const handleEffect = useCallback(
    (event: EffectEvent) => {
      if (event.type === 'EAT') {
        const id = `burst-${Date.now()}-${Math.random()}`;
        const baseCount = 10;
        const particleCount = Math.max(3, Math.round(baseCount * particleMultiplier));


        setBursts((prev) => [...prev, { id, position: event.position.clone(), particleCount }]);
      }
    },
    [particleMultiplier]
  );

  const removeBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Register listener on mount
  useEffect(() => {
    addEffectListener(handleEffect);
    return () => removeEffectListener(handleEffect);
  }, [handleEffect]);

  return (
    <>
      {bursts.map((burst) => (
        <EatingBurst
          key={burst.id}
          position={burst.position}
          particleCount={burst.particleCount}
          onComplete={() => removeBurst(burst.id)}
        />
      ))}
    </>
  );
};
