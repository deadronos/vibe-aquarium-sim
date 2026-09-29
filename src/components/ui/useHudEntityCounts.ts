import { useEffect, useState } from 'react';
import { world } from '../../store';

export const useHudEntityCounts = () => {
  const [fishCount, setFishCount] = useState(0);
  const [foodCount, setFoodCount] = useState(0);
  const [, forceUpdate] = useState(0);

  // Poll ECS for entity counts
  useEffect(() => {
    const interval = setInterval(() => {
      setFishCount(world.with('isFish').entities.length);
      setFoodCount(world.with('isFood').entities.length);
      forceUpdate((n) => n + 1); // Update time display
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return { fishCount, foodCount };
};
