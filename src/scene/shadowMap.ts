import type { LightShadow } from 'three';

interface ShadowMapState {
  needsUpdate: boolean;
}

/** Dispose the old target because Three reuses it even after `mapSize` changes. */
export const resizeShadowMap = (shadow: LightShadow, shadowMap: ShadowMapState, size: number) => {
  shadow.map?.dispose();
  shadow.map = null;
  shadow.mapPass?.dispose();
  shadow.mapPass = null;
  shadow.mapSize.set(size, size);
  shadowMap.needsUpdate = true;
};
