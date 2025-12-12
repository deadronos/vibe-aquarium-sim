import createECS from "miniplex-react";
import { Vector3, Quaternion } from "three";
import { World } from "miniplex";

export type Entity = {
  // Metadata
  id?: string;

  // Tags
  isFish?: boolean;
  isBoid?: boolean;

  // Physics / Transform (synced from Rapier)
  position?: Vector3;
  quaternion?: Quaternion;
  velocity?: Vector3; // Linear velocity

  // Boids / Steering
  steeringForce?: Vector3; // The force calculated by BoidsSystem to be applied to the RigidBody
};

export const world = new World<Entity>();
export const ECS = createECS(world);
