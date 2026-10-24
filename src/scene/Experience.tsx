import { PerformanceMonitor } from '@react-three/drei';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useAquarium } from '../state/store';
import { AmbientDirector } from './AmbientDirector';
import { CameraRig } from './CameraRig';
import { ContextWatcher } from './ContextWatcher';
import { DaylightDriver } from './DaylightDriver';
import {
  EffectsChunkError,
  effectsChunkUrl,
  importEffectsModule,
  isEffectsChunkError,
  newVersionDeployed,
} from './effectsChunk';
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
const loadEffects = async (attempt: number, chunkUrl: string | null): Promise<EffectsView> => {
  if (attempt === 0) return (await import('./Effects')).Effects;
  // Without the chunk URL the only option is the bundled import, which the browser has
  // cached as failed, so this attempt reports that a reload is needed.
  if (chunkUrl === null) throw new EffectsChunkError('Effects chunk URL is unknown', false);
  return (await importEffectsModule(attempt, chunkUrl)).Effects as EffectsView;
};

const createEffects = (attempt: number, chunkUrl: string | null) =>
  lazy(async () => {
    const view = await loadEffects(attempt, chunkUrl);
    // The post stack is in, so an earlier "did not download" notice no longer applies.
    useAquarium.getState().setEffectsNotice(null);
    return { default: view };
  });

/** Rendered next to the post stack, so it mounts once the chunk has arrived. */
const HoldQuality = () => {
  const holdQuality = useAquarium((state) => state.holdQuality);
  useEffect(() => holdQuality(), [holdQuality]);
  return null;
};

export const Experience = () => {
  const quality = useAquarium((state) => state.quality);
  const setQuality = useAquarium((state) => state.setQuality);
  const setEffectsNotice = useAquarium((state) => state.setEffectsNotice);
  const autoDowngrade = useAquarium((state) => state.autoDowngrade);
  const [effectsLoad, setEffectsLoad] = useState(() => ({
    attempt: 0,
    chunkUrl: null as string | null,
    View: createEffects(0, null),
  }));

  /**
   * Any post-stack error drops to Lite and says so in the HUD. Only a failed download gets a
   * fresh loader: after the chunk has evaluated, a new loader would evaluate a second copy of
   * `postprocessing`, so a runtime error keeps the loaded component.
   */
  const onEffectsError = (error: unknown) => {
    setQuality('low');
    if (!isEffectsChunkError(error)) {
      setEffectsNotice('crash');
      return;
    }
    const retryable = !(error instanceof EffectsChunkError) || error.retryable;
    const chunkUrl = effectsChunkUrl(error) ?? effectsLoad.chunkUrl;
    if (!retryable || chunkUrl === null) {
      setEffectsNotice('reload');
    } else {
      setEffectsNotice('retry');
      setEffectsLoad((current) => ({
        attempt: current.attempt + 1,
        chunkUrl,
        View: createEffects(current.attempt + 1, chunkUrl),
      }));
    }
    // After a new deploy the old hashed chunks are gone for good, so retrying cannot help.
    void newVersionDeployed().then((stale) => {
      if (stale) setEffectsNotice('update');
    });
  };

  const EffectsView = effectsLoad.View;
  return (
    <>
      <ContextWatcher />
      <DaylightDriver />
      {/* Remounted per quality so frames sampled in Lite never count against High. */}
      <PerformanceMonitor key={quality} onDecline={autoDowngrade} />
      <CameraRig />
      <AmbientDirector />
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
            <HoldQuality />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
};
