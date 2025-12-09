import { useFrame } from '@react-three/fiber';
import { fixedScheduler } from '../utils/FixedStepScheduler';

export const SchedulerSystem = () => {
  useFrame((_, delta) => {
    fixedScheduler.update(delta);
  });
  return null;
};
