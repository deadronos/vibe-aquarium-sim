import createECS from 'miniplex-react';
import { Vector3, Quaternion } from 'three';
import { World } from 'miniplex';
import type { RapierRigidBody } from '@react-three/rapier';

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
  // The Rapier body handle (integer) — avoid storing WASM wrapper objects in ECS
  rigidBodyHandle?: number;
  // Accumulated external forces (e.g. water drag) scheduled by systems — applied by component
  externalForce?: Vector3;

  // Boids / Steering
  steeringForce?: Vector3; // The force calculated by BoidsSystem to be applied to the RigidBody
};

export const world = new World<Entity>();
export const ECS = createECS(world);
