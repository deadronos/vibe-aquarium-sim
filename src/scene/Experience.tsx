import { PerformanceMonitor } from '@react-three/drei';
import { lazy, Suspense, useState } from 'react';
import { useAquarium } from '../state/store';
import { CameraRig } from './CameraRig';
import { ContextWatcher } from './ContextWatcher';
import { DaylightDriver } from './DaylightDriver';
import { effectsChunkUrl, importEffectsModule } from './effectsChunk';
import { ErrorBoundary } from './ErrorBoundary';
import { FishLoader } from './fish/FishLoader';
import { Lights } from './Lights';
import { Furniture } from './room/Furniture';
import { Room } from './room/Room';
import { Aquascape } from './tank/Aquascape';
import { Tank } from './tank/Tank';
import { WaterFx } from './tank/WaterFx';

type EffectsView = typeof import('./Effects').Effects;

/**
 * Attempt 0 is the bundled dynamic import. After that fails, a new lazy component
 * loads the same chunk from a different URL. React and the browser both keep the rejection.
 */
const createEffects = (attempt: number, chunkUrl: string | null) =>
  lazy(async (): Promise<{ default: EffectsView }> => {
    if (attempt === 0 || chunkUrl === null) {
      const module = await import('./Effects');
      return { default: module.Effects };
    }
    const module = await importEffectsModule(attempt, chunkUrl);
    return { default: module.Effects as EffectsView };
  });

export const Experience = () => {
  const quality = useAquarium((state) => state.quality);
  const setQuality = useAquarium((state) => state.setQuality);
  const [effectsLoad, setEffectsLoad] = useState(() => ({
    attempt: 0,
    View: createEffects(0, null),
  }));

  /** A missing or stale chunk drops to Lite. The next High mounts a fresh loader and tries again. */
  const onEffectsError = (error: unknown) => {
    const chunkUrl = effectsChunkUrl(error);
    setEffectsLoad((current) => ({
      attempt: current.attempt + 1,
      View: createEffects(current.attempt + 1, chunkUrl),
    }));
    setQuality('low');
  };

  const EffectsView = effectsLoad.View;
  return (
    <>
      <ContextWatcher />
      <DaylightDriver />
      <PerformanceMonitor onDecline={() => setQuality('low')} />
      <CameraRig />
      <Lights />
      <Room />
      <Furniture />
      <Aquascape />
      <FishLoader />
      <WaterFx />
      <Tank />
      {quality === 'high' && (
        <ErrorBoundary key={effectsLoad.attempt} onError={onEffectsError}>
          <Suspense fallback={null}>
            <EffectsView />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
};
