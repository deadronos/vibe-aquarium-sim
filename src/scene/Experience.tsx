import { PerformanceMonitor } from '@react-three/drei';
import { lazy, Suspense } from 'react';
import { useAquarium } from '../state/store';
import { CameraRig } from './CameraRig';
import { ContextWatcher } from './ContextWatcher';
import { DaylightDriver } from './DaylightDriver';
import { FishLoader } from './fish/FishLoader';
import { Lights } from './Lights';
import { Furniture } from './room/Furniture';
import { Room } from './room/Room';
import { Aquascape } from './tank/Aquascape';
import { Tank } from './tank/Tank';
import { WaterFx } from './tank/WaterFx';

/** High-quality post stack. Loaded only after quality resolves to High, so Lite never fetches it. */
const Effects = lazy(() => import('./Effects').then((module) => ({ default: module.Effects })));

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
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </>
  );
};
