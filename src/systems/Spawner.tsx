import { useEffect } from 'react';
import { Vector3 } from 'three';
import { SIMULATION_BOUNDS, TANK_DIMENSIONS } from '../config/constants';
import { getDecorationSpawnDescriptors, getInitialFishSpawn } from '../config/artDirection';
import { world } from '../store';
import type { Entity } from '../store';

const MAX_INSTANCES_PER_MODEL = 1000;
const MAX_TOTAL_FISH = MAX_INSTANCES_PER_MODEL * 3; // 3000 — one full cap per model

const fishQuery = world.with('isFish');

export const Spawner = () => {
  useEffect(() => {
    const spawnedEntities: Entity[] = [];
    const stressMode =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('stress')?.toLowerCase() === 'quality';
    const initialFishCount = stressMode ? 300 : 30;

    // Keep normal startup light; the explicit quality stress query exercises a
    // bounded larger school without changing the production default.
    for (let i = 0; i < initialFishCount; i++) {
      const spawn = getInitialFishSpawn(i, initialFishCount);
      const entity = world.add({
        isFish: true,
        isBoid: true,
        position: new Vector3(spawn.x, spawn.y, spawn.z),
        velocity: new Vector3(spawn.vx, spawn.vy, spawn.vz),
        steeringForce: new Vector3(),
        externalForce: new Vector3(),
        targetVelocity: new Vector3(),
        excitementLevel: 0,
        modelIndex: spawn.modelIndex,
        excitementDecay: 0,
      });
      spawnedEntities.push(entity);
    }

    // Keep the opening composition stable and clustered so the tank retains a
    // clear center lane for the school. Props are seeded outside the render loop.
    for (const descriptor of getDecorationSpawnDescriptors()) {
      const entity = world.add({
        isDecoration: true,
        decorationType: descriptor.type,
        position: new Vector3(descriptor.x, -TANK_DIMENSIONS.height / 2, descriptor.z),
        decorationProps: descriptor.props,
      });
      spawnedEntities.push(entity);
    }

    if (typeof window !== 'undefined') {
      if (window.__vibe_qualityStatus) {
        window.__vibe_qualityStatus.stressMode = stressMode;
        window.__vibe_qualityStatus.fishCount = fishQuery.entities.length;
      }
      window.__vibe_addFish = (n: number) => {
        const currentFishCount = fishQuery.entities.length;
        const available = MAX_TOTAL_FISH - currentFishCount;

        if (available <= 0) {
          console.warn(
            `[Spawner] Cannot add more fish: total cap reached ` +
              `(${currentFishCount}/${MAX_TOTAL_FISH}, MAX_INSTANCES_PER_MODEL = ${MAX_INSTANCES_PER_MODEL}).`
          );
          return 0;
        }

        const toAdd = Math.min(n, available);
        if (toAdd < n) {
          console.warn(
            `[Spawner] Clamping add-fish request from ${n} to ${toAdd} ` +
              `(total cap: ${MAX_TOTAL_FISH}, current: ${currentFishCount}).`
          );
        }

        let added = 0;
        for (let i = 0; i < toAdd; i++) {
          const entity = world.add({
            isFish: true,
            isBoid: true,
            position: new Vector3(
              (Math.random() - 0.5) * (SIMULATION_BOUNDS.x * 2),
              (Math.random() - 0.5) * (SIMULATION_BOUNDS.y * 2),
              (Math.random() - 0.5) * (SIMULATION_BOUNDS.z * 2)
            ),
            velocity: new Vector3(
              (Math.random() - 0.5) * 1,
              (Math.random() - 0.5) * 1,
              (Math.random() - 0.5) * 1
            ),
            steeringForce: new Vector3(),
            externalForce: new Vector3(),
            targetVelocity: new Vector3(),
            excitementLevel: 0,
            modelIndex: Math.floor(Math.random() * 3) as 0 | 1 | 2,
            excitementDecay: 0,
          });
          spawnedEntities.push(entity);
          added++;
        }
        if (window.__vibe_qualityStatus) {
          window.__vibe_qualityStatus.fishCount = fishQuery.entities.length;
        }
        return added;
      };
    }

    return () => {
      // Cleanup dynamically spawned entities on unmount
      spawnedEntities.forEach((ent) => {
        if (world.has(ent)) {
          world.remove(ent);
        }
      });
      if (typeof window !== 'undefined') {
        delete (window as any).__vibe_addFish;
      }
    };
  }, []);
  return null;
};
