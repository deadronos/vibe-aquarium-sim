import { useEffect } from 'react';
import { BOIDS_CONFIG, SIMULATION_BOUNDS } from '../config/constants';
import { waterPhysics, currentPhysics } from '../config/waterPhysics';
import { fixedScheduler } from '../utils/FixedStepScheduler';
import { updateSnapshots } from './boids/snapshot';
import { applySimulationResult } from './boids/resultApplier';
import { WorkerOrchestrator } from './boids/workerOrchestrator';
import type { SimulationInput } from '../workers/simulationWorker';

export const BoidsSystem = () => {
  useEffect(() => {
    const orchestrator = new WorkerOrchestrator();
    let elapsedTime = 0;

    const unsubscribe = fixedScheduler.add((dt) => {
      elapsedTime += dt;

      // Apply pending result
      const pending = orchestrator.getPendingResult();
      if (pending) {
        applySimulationResult(pending.result, pending.count);
        orchestrator.clearPendingResult();
      }

      // Schedule new job
      if (!orchestrator.isBusy() && !orchestrator.getPendingResult()) {
        const {
          positions,
          velocities,
          foodPositions,
          fishCount,
          foodCount,
        } = updateSnapshots();

        if (fishCount > 0) {
          const input: SimulationInput = {
            fishCount,
            positions,
            velocities,
            foodCount,
            foodPositions,
            time: elapsedTime,
            boids: BOIDS_CONFIG,
            bounds: SIMULATION_BOUNDS,
            water: waterPhysics,
            current: currentPhysics,
          };
          orchestrator.submitJob(input);
        }
      }
    });

    return () => {
      unsubscribe();
      orchestrator.dispose();
    };
  }, []);

  return null;
};
