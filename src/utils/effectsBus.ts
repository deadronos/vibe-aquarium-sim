import { Vector3 } from 'three';

export type EffectType = 'EAT' | 'SPLASH';

export interface EffectEvent {
  type: EffectType;
  position: Vector3;
  payload?: any;
}

type EffectListener = (event: EffectEvent) => void;
const listeners: Set<EffectListener> = new Set();

export const triggerEffect = (type: EffectType, position: Vector3, payload?: any) => {
  listeners.forEach((listener) =>
    listener({
      type,
      position: position.clone(),
      payload,
    })
  );
};

// Legacy support for EatingBurst
export const triggerEatingBurst = (position: Vector3) => {
  triggerEffect('EAT', position);
};

export const addEffectListener = (listener: EffectListener) => {
  listeners.add(listener);
};

export const removeEffectListener = (listener: EffectListener) => {
  listeners.delete(listener);
};
