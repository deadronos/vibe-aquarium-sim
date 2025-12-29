import { useEffect } from 'react';
import { BOIDS_CONFIG, SIMULATION_BOUNDS } from '../config/constants';
import { waterPhysics } from '../config/waterPhysics';
import { world } from '../store';
import type { Entity } from '../store';
import { fixedScheduler } from '../utils/FixedStepScheduler';
import { triggerEatingBurst } from '../utils/effectsBus';
import {
  simulateStep,
  type SimulationInput,
  type SimulationOutput,
} from '../workers/simulationWorker';

const fishSnapshot: Entity[] = [];
const foodSnapshot: Entity[] = [];
const eatenFoodSet = new Set<number>();

type Float32Buffer = Float32Array<ArrayBufferLike>;

let positions: Float32Buffer = new Float32Array(0);
let velocities: Float32Buffer = new Float32Array(0);
let foodPositions: Float32Buffer = new Float32Array(0);

let pendingResult: SimulationOutput | null = null;
let pendingFishCount = 0;
let hasJob = false;
let elapsedTime = 0;
let disposed = false;
let worker: Worker | null = null;

// Toggle for PoC: true = use Worker, false = use Main Thread
let useWorker = true;
// We can expose this via window for testing if needed, or build a small UI.
// For now, I'll attach it to window.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).toggleBoidsWorker = () => {
    useWorker = !useWorker;
    console.log(`[BoidsSystem] Worker enabled: ${useWorker}`);
  };
}

const workerInput: SimulationInput = {
  fishCount: 0,
  positions,
  velocities,
  foodCount: 0,
  foodPositions,
  time: 0,
  boids: BOIDS_CONFIG,
  bounds: SIMULATION_BOUNDS,
  water: waterPhysics,
};

const ensureCapacity = (buffer: Float32Buffer, needed: number): Float32Buffer => {
  if (buffer.length < needed) {
    return new Float32Array(needed);
  }
  return buffer;
};

const applyResult = () => {
  if (!pendingResult) return;
  const { steering, externalForces, eatenFoodIndices } = pendingResult;

  for (let i = 0; i < pendingFishCount; i++) {
    const entity = fishSnapshot[i];
    if (!entity?.steeringForce || !entity.externalForce) continue;
    const base = i * 3;
    entity.steeringForce.set(steering[base], steering[base + 1], steering[base + 2]);
    entity.externalForce.set(
      externalForces[base],
      externalForces[base + 1],
      externalForces[base + 2]
    );
  }

  if (eatenFoodIndices.length > 0) {
    eatenFoodSet.clear();
    for (let i = 0; i < eatenFoodIndices.length; i++) {
      eatenFoodSet.add(eatenFoodIndices[i]);
    }
    for (const index of eatenFoodSet) {
      const food = foodSnapshot[index];
      if (!food) continue;
      if (food.position) {
        triggerEatingBurst(food.position);
      }
      world.remove(food);
    }
  }

  pendingResult = null;
  pendingFishCount = 0;
  hasJob = false;
};

const startWorkerJob = () => {
  fishSnapshot.length = 0;
  for (const entity of world.with(
    'isBoid',
    'position',
    'velocity',
    'steeringForce',
    'externalForce'
  )) {
    fishSnapshot.push(entity);
  }

  const fishCount = fishSnapshot.length;
  if (fishCount === 0) {
    hasJob = false;
    return;
  }

  foodSnapshot.length = 0;
  for (const entity of world.with('isFood', 'position')) {
    foodSnapshot.push(entity);
  }

  const foodCount = foodSnapshot.length;

  positions = ensureCapacity(positions, fishCount * 3);
  velocities = ensureCapacity(velocities, fishCount * 3);
  foodPositions = ensureCapacity(foodPositions, foodCount * 3);

  for (let i = 0; i < fishCount; i++) {
    const entity = fishSnapshot[i];
    if (!entity.position || !entity.velocity) continue;
    const base = i * 3;
    positions[base] = entity.position.x;
    positions[base + 1] = entity.position.y;
    positions[base + 2] = entity.position.z;
    velocities[base] = entity.velocity.x;
    velocities[base + 1] = entity.velocity.y;
    velocities[base + 2] = entity.velocity.z;
  }

  for (let i = 0; i < foodCount; i++) {
    const entity = foodSnapshot[i];
    if (!entity.position) continue;
    const base = i * 3;
    foodPositions[base] = entity.position.x;
    foodPositions[base + 1] = entity.position.y;
    foodPositions[base + 2] = entity.position.z;
  }

  workerInput.fishCount = fishCount;
  workerInput.positions = positions;
  workerInput.velocities = velocities;
  workerInput.foodCount = foodCount;
  workerInput.foodPositions = foodPositions;
  workerInput.time = elapsedTime;

  const jobFishCount = fishCount;

  if (useWorker && worker) {
    hasJob = true;
    worker.postMessage(workerInput);
    // Note: We are not using Transferable objects (buffers) here because we reuse
    // the same 'positions'/'velocities' arrays in the main thread every frame.
    // structuredClone will copy them.
    // For optimization, we could use SharedArrayBuffer if available,
    // or swap buffers (ping-pong) to use transferables.
    // Given the task is medium-large effort but priority high, let's stick to copying for now
    // unless performance is bad, as logic reuse is safer.
    // Actually, 'workerInput' holds references to 'positions', so structuredClone copies the underlying buffer.

    // We handle the response in onmessage
  } else {
    // Main thread fallback
    try {
      pendingResult = simulateStep(workerInput);
      pendingFishCount = jobFishCount;
    } catch (error) {
      console.error('Boids simulation failed', error);
    }
    hasJob = false;
  }
};

export const BoidsSystem = () => {
  useEffect(() => {
    disposed = false;

    // Initialize Worker
    if (typeof Worker !== 'undefined') {
      try {
        worker = new Worker(new URL('../workers/boids.worker.ts', import.meta.url), {
          type: 'module',
        });

        worker.onmessage = (event) => {
          if (disposed) return;
          const data = event.data;
          if (data.type === 'success') {
             pendingResult = data.result;
             pendingFishCount = workerInput.fishCount; // Use the count from the input that triggered this
             hasJob = false;
          } else if (data.type === 'error') {
            console.error('Worker error:', data.error);
            hasJob = false;
          }
        };

        worker.onerror = (error) => {
           console.error('Worker error:', error);
           hasJob = false;
        };
      } catch (e) {
        console.error('Failed to create worker:', e);
        useWorker = false;
      }
    } else {
      useWorker = false;
    }

    const unsubscribe = fixedScheduler.add((dt) => {
      elapsedTime += dt;

      if (pendingResult) {
        applyResult();
      }

      if (!hasJob && !pendingResult) {
        startWorkerJob();
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };
  }, []);

  return null;
};
