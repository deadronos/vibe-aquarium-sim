import { world } from '../../store';
import { triggerEatingBurst } from '../../utils/effectsBus';
import type { SimulationOutput } from '../../workers/simulationWorker';
import { fishSnapshot, foodSnapshot } from './snapshot';

const eatenFoodSet = new Set<number>();

export function applySimulationResult(
  result: SimulationOutput,
  fishCount: number
) {
  const { steering, externalForces, eatenFoodIndices } = result;

  for (let i = 0; i < fishCount; i++) {
    const entity = fishSnapshot[i];
    if (!entity?.steeringForce || !entity.externalForce) continue;
    const base = i * 3;
    entity.steeringForce.set(steering[base], steering[base + 1], steering[base + 2]);

    // BoidsSystem is the authoritative source for external forces (drag + current).
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
}
