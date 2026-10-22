import { FishSchool } from '../../sim/school';
import { FoodPool } from '../../sim/food';
import { createRandom } from '../../sim/random';
import { SPECIES } from '../../sim/species';

/** The single running aquarium simulation, shared by the fish view, tank clicks and camera. */
export const simulation = {
  school: new FishSchool(SPECIES, createRandom(2024)),
  food: new FoodPool(createRandom(7)),
};
