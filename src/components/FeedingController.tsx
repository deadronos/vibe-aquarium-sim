import { useState, useCallback } from 'react';
import { Vector3 } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { world } from '../store';
import { useGameStore } from '../gameStore';
import { SIMULATION_BOUNDS, TANK_DIMENSIONS } from '../config/constants';
import { ClickRipple } from './effects/ClickRipple';
import { feedAt } from '../game/feedingActions';

interface RippleEffect {
  id: string;
  position: Vector3;
}

export const FeedingController = () => {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const { isPlacingDecoration, selectedDecorationType, stopPlacingDecoration } = useGameStore();

  const removeRipple = useCallback((id: string) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const point = e.point;

      if (isPlacingDecoration) {
        // Place decoration on tank floor
        const floorY = -TANK_DIMENSIONS.height / 2 + 0.01;

        // Clamp to tank bounds
        const x = Math.max(-SIMULATION_BOUNDS.x, Math.min(SIMULATION_BOUNDS.x, point.x));
        const z = Math.max(-SIMULATION_BOUNDS.z, Math.min(SIMULATION_BOUNDS.z, point.z));

        world.add({
          isDecoration: true,
          decorationType: selectedDecorationType,
          position: new Vector3(x, floorY, z),
        });

        stopPlacingDecoration();
      } else {
        // Spawn food
        const rippleId = `ripple-${Date.now()}-${Math.random()}`;
        setRipples((prev) => [...prev, { id: rippleId, position: point.clone() }]);

        feedAt(point);
      }
    },
    [isPlacingDecoration, selectedDecorationType, stopPlacingDecoration]
  );

  return (
    <>
      <mesh position={[0, 0, 0]} onClick={handleClick}>
        <boxGeometry
          args={[TANK_DIMENSIONS.width, TANK_DIMENSIONS.height, TANK_DIMENSIONS.depth]}
        />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Render active ripple effects */}
      {ripples.map((ripple) => (
        <ClickRipple
          key={ripple.id}
          position={ripple.position}
          onComplete={() => removeRipple(ripple.id)}
        />
      ))}
    </>
  );
};
