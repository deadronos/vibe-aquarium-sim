import { PerformanceMonitor } from '@react-three/drei';
import { lazy, Suspense, useState } from 'react';
import { useAquarium } from '../state/store';
import { CameraRig } from './CameraRig';
import { ContextWatcher } from './ContextWatcher';
import { DaylightDriver } from './DaylightDriver';
import { ErrorBoundary } from './ErrorBoundary';
import { FishLoader } from './fish/FishLoader';
import { Lights } from './Lights';
import { Furniture } from './room/Furniture';
import { Room } from './room/Room';
import { Aquascape } from './tank/Aquascape';
import { Tank } from './tank/Tank';
import { WaterFx } from './tank/WaterFx';

/** One lazy import. React remembers a rejection, so a retry has to be a new component. */
const createEffects = () =>
  lazy(() => import('./Effects').then((module) => ({ default: module.Effects })));

export const Experience = () => {
  const quality = useAquarium((state) => state.quality);
  const setQuality = useAquarium((state) => state.setQuality);
  const [effectsLoad, setEffectsLoad] = useState(() => ({ attempt: 0, View: createEffects() }));

  /** A missing or stale chunk drops to Lite. The next High mounts a fresh loader and tries again. */
  const onEffectsError = () => {
    setEffectsLoad((current) => ({ attempt: current.attempt + 1, View: createEffects() }));
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
