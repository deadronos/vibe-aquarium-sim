import { Vector3 } from 'three';

type EffectListener = (position: Vector3) => void;
const listeners: Set<EffectListener> = new Set();

export const triggerEatingBurst = (position: Vector3) => {
  listeners.forEach((listener) => listener(position.clone()));
};

export const addEffectListener = (listener: EffectListener) => {
  listeners.add(listener);
};

export const removeEffectListener = (listener: EffectListener) => {
  listeners.delete(listener);
};
