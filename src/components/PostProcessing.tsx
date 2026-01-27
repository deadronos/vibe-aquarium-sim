import { DepthOfField } from '@react-three/postprocessing';
import { EffectComposer } from './vfx/EffectComposer';
import { useMemo } from 'react';

import { useVisualQuality } from '../performance/VisualQualityContext';
import { useQualityStore } from '../performance/qualityStore';

const PostProcessingEnabled = () => {
  const qualityLevel = useQualityStore((s) => s.level);

  const { multisampling, resolutionScale } = useMemo(() => {
    // Keep it conservative: mild DOF, low MSAA cost.
    // Note: DOF is typically only enabled on Ultra preset.
    const msaaByLevel: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      ultra: 2,
    };

    const scaleByLevel: Record<string, number> = {
      low: 1,
      medium: 1,
      high: 1,
      ultra: 1,
    };

    return {
      multisampling: msaaByLevel[qualityLevel] ?? 0,
      resolutionScale: scaleByLevel[qualityLevel] ?? 1,
    };
  }, [qualityLevel]);

  return (
    <EffectComposer multisampling={multisampling} resolutionScale={resolutionScale}>
      <DepthOfField focusDistance={0.02} focalLength={0.03} bokehScale={1.25} height={480} />
    </EffectComposer>
  );
};

export const PostProcessing = ({ isWebGPU }: { isWebGPU: boolean }) => {
  const { depthOfFieldEnabled } = useVisualQuality();

  if (isWebGPU) return null;

  return <>{depthOfFieldEnabled ? <PostProcessingEnabled /> : null}</>;
};
