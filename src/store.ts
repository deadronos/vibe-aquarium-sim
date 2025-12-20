import createECS from 'miniplex-react';
import { Vector3, Quaternion } from 'three';
import { World } from 'miniplex';

export type DecorationType = 'seaweed' | 'coral' | 'rock';

export type Entity = {
  // Metadata
  id?: string;

  // Tags
  isFish?: boolean;
  isBoid?: boolean;
  isFood?: boolean;
  isDecoration?: boolean;

  // Physics / Transform (synced from Rapier)
  position?: Vector3;
  quaternion?: Quaternion;
  velocity?: Vector3; // Linear velocity
  // The Rapier body handle (integer) — avoid storing WASM wrapper objects in ECS
  rigidBodyHandle?: number;
  // Accumulated external forces (e.g. water drag) scheduled by systems — applied by component
  externalForce?: Vector3;
  // Target velocity for direct velocity control (avoids impulse re-entrancy issues)
  targetVelocity?: Vector3;

  // Boids / Steering
  steeringForce?: Vector3; // The force calculated by BoidsSystem to be applied to the RigidBody

  // Decoration properties
  decorationType?: DecorationType;
  decorationProps?: Record<string, unknown>; // Arbitrary data to configure decoration components (seeded at spawn time)
  // Visual/FX specific data pulled from spawn events (e.g., bubble trails for food)
  bubbleConfig?: Array<{ offset: Vector3; speed: number; phase: number; size: number; wobble: number }> | undefined;

  // Fish state
  excitementLevel?: number; // 0-1, triggers flash/speed boost
  excitementDecay?: number; // Time remaining for excitement
};

export const world = new World<Entity>();
export const ECS = createECS(world);
