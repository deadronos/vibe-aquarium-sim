import { useEffect } from 'react';
import { initRuntime, move, spawn } from 'multithreading';
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

let positions = new Float32Array(0);
let velocities = new Float32Array(0);
let foodPositions = new Float32Array(0);

let pendingResult: SimulationOutput | null = null;
let pendingFishCount = 0;
let hasJob = false;
let elapsedTime = 0;
let runtimeReady = false;
let disposed = false;

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

const ensureCapacity = (buffer: Float32Array, needed: number) => {
  if (buffer.length < needed) {
    return new Float32Array(needed);
  }
  return buffer;
};

const ensureRuntime = () => {
  if (runtimeReady) return;
  const cores =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;
  const maxWorkers = Math.max(2, Math.min(cores, 8));
  try {
    initRuntime({ maxWorkers });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Runtime already initialized')) {
      throw error;
    }
  }
  runtimeReady = true;
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
  hasJob = true;
  const handle = spawn(move(workerInput), simulateStep);
  handle
    .join()
    .then((result) => {
      if (!result.ok) {
        console.error('Boids worker failed', result.error);
        hasJob = false;
        return;
      }
      if (disposed) {
        hasJob = false;
        return;
      }
      pendingResult = result.value;
      pendingFishCount = jobFishCount;
    })
    .catch((error) => {
      console.error('Boids worker failed', error);
      hasJob = false;
    });
};

export const BoidsSystem = () => {
  useEffect(() => {
    ensureRuntime();
    disposed = false;

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
    };
  }, []);

  return null;
};
