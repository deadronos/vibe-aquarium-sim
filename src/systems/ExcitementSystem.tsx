import { useEffect } from 'react';
import { world } from '../store';
import { fixedScheduler } from '../utils/FixedStepScheduler';

const updateExcitement = (dt: number) => {
  // Query entities that have excitement components
  // Note: We check > 0 in the loop, so we query for existence of the component
  const entities = world.with('isFish', 'excitementLevel', 'excitementDecay');

  for (const entity of entities) {
    if (entity.excitementLevel > 0) {
      const newDecay = entity.excitementDecay - dt;
      if (newDecay <= 0) {
        // Reset excitement
        world.addComponent(entity, 'excitementLevel', 0);
        world.addComponent(entity, 'excitementDecay', 0);
      } else {
        // Update decay timer
        world.addComponent(entity, 'excitementDecay', newDecay);
      }
    }
  }
};

export const ExcitementSystem = () => {
  useEffect(() => {
    return fixedScheduler.add((dt) => {
      updateExcitement(dt);
    });
  }, []);
  return null;
};
