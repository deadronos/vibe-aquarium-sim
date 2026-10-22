import { PerformanceMonitor } from '@react-three/drei';
import { Suspense } from 'react';
import { useAquarium } from '../state/store';
import { CameraRig } from './CameraRig';
import { DaylightDriver } from './DaylightDriver';
import { Effects } from './Effects';
import { FishView } from './fish/FishView';
import { Lights } from './Lights';
import { Furniture } from './room/Furniture';
import { Room } from './room/Room';
import { Aquascape } from './tank/Aquascape';
import { Tank } from './tank/Tank';
import { WaterFx } from './tank/WaterFx';

export const Experience = () => {
  const quality = useAquarium((state) => state.quality);
  const setQuality = useAquarium((state) => state.setQuality);
  return (
    <>
      <DaylightDriver />
      <PerformanceMonitor onDecline={() => setQuality('low')} />
      <CameraRig />
      <Lights />
      <Room />
      <Furniture />
      <Aquascape />
      <Suspense fallback={null}>
        <FishView />
      </Suspense>
      <WaterFx />
      <Tank />
      {quality === 'high' && <Effects />}
    </>
  );
};
