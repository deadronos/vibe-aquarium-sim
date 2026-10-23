import { PerformanceMonitor } from '@react-three/drei';
import { lazy, Suspense } from 'react';
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

/** High-quality post stack. High requests it on the first render; Lite never mounts it. */
const Effects = lazy(() => import('./Effects').then((module) => ({ default: module.Effects })));

/** A missing or stale chunk drops to Lite. The boundary around the canvas would blank the room. */
const onEffectsError = () => {
  useAquarium.getState().setQuality('low');
};

export const Experience = () => {
  const quality = useAquarium((state) => state.quality);
  const setQuality = useAquarium((state) => state.setQuality);
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
        <ErrorBoundary onError={onEffectsError}>
          <Suspense fallback={null}>
            <Effects />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
};
