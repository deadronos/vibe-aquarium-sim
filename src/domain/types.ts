import type { Vector3 } from 'three';

export type DecorationType = 'seaweed' | 'coral' | 'rock';

export type Vec3Like = { x: number; y: number; z: number };

export type BubbleConfig = Array<{
  offset: Vector3;
  speed: number;
  phase: number;
  size: number;
  wobble: number;
}>;
