import { useState, useCallback } from 'react';
import { Vector3 } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { world } from '../store';
import { useGameStore } from '../gameStore';
import { SIMULATION_BOUNDS, TANK_DIMENSIONS } from '../config/constants';
import { ClickRipple } from './effects/ClickRipple';

interface RippleEffect {
  id: string;
  position: Vector3;
}

export const FeedingController = () => {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const {
    isPlacingDecoration,
    selectedDecorationType,
    stopPlacingDecoration,
    setLastFedTime
  } = useGameStore();

  const removeRipple = useCallback((id: string) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
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
      setRipples(prev => [...prev, { id: rippleId, position: point.clone() }]);

      // Trigger fish excitement for nearby fish
      const fishEntities = world.with('isFish', 'position');
      for (const fish of fishEntities) {
        if (!fish.position) continue;
        const dist = fish.position.distanceTo(point);
        if (dist < 2.0) {
          fish.excitementLevel = 1.0;
          fish.excitementDecay = 1.0; // 1 second of excitement
        }
      }

      // Clamp to simulation bounds so fish can reach it
      const x = Math.max(-SIMULATION_BOUNDS.x, Math.min(SIMULATION_BOUNDS.x, point.x));
      const z = Math.max(-SIMULATION_BOUNDS.z, Math.min(SIMULATION_BOUNDS.z, point.z));

      // Seed bubble configuration for the food entity (generated in event handler)
      const bubbleConfig = Array.from({ length: 8 }, () => ({
        offset: new Vector3(
          (Math.random() - 0.5) * 0.04,
          Math.random() * 0.03,
          (Math.random() - 0.5) * 0.04,
        ),
        speed: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        size: 0.004 + Math.random() * 0.006,
        wobble: 0.01 + Math.random() * 0.015,
      }));

      world.add({
        isFood: true,
        position: new Vector3(x, point.y, z),
        velocity: new Vector3(0, -0.08, 0), // Slow sink ~8cm/s
        bubbleConfig,
      });

      setLastFedTime(new Date());
    }
  }, [isPlacingDecoration, selectedDecorationType, stopPlacingDecoration, setLastFedTime]);

  return (
    <>
      <mesh
        position={[0, 0, 0]}
        onClick={handleClick}
      >
        <boxGeometry args={[TANK_DIMENSIONS.width, TANK_DIMENSIONS.height, TANK_DIMENSIONS.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Render active ripple effects */}
      {ripples.map(ripple => (
        <ClickRipple
          key={ripple.id}
          position={ripple.position}
          onComplete={() => removeRipple(ripple.id)}
        />
      ))}
    </>
  );
};
