import type { MutableRefObject } from 'react';

import type * as THREE from 'three';
import { useVisualQuality } from '../performance/VisualQualityContext';
import { ART_DIRECTION_LIGHTING } from '../config/artDirection';

export function SceneLights({
  directionalLightRef,
  spotLightRef,
  initialShadowMapSize,
}: {
  directionalLightRef: MutableRefObject<THREE.DirectionalLight | null>;
  spotLightRef: MutableRefObject<THREE.SpotLight | null>;
  initialShadowMapSize: number;
}) {
  const { spotLightShadowsEnabled } = useVisualQuality();

  return (
    <>
      {/* Directional key light to give stronger highlights */}
      <directionalLight
        ref={directionalLightRef}
        position={[1.8, 3.4, 2.6]}
        color={ART_DIRECTION_LIGHTING.keyColor}
        intensity={ART_DIRECTION_LIGHTING.keyIntensity}
        castShadow
        shadow-mapSize-width={initialShadowMapSize}
        shadow-mapSize-height={initialShadowMapSize}
      />
      {/* Soft spot to add depth & visible speculars */}
      <spotLight
        ref={spotLightRef}
        position={[-2.4, 2.6, 1.8]}
        angle={0.72}
        penumbra={0.82}
        intensity={0.42}
        color="#d8c6a7"
        castShadow={spotLightShadowsEnabled}
        shadow-mapSize-width={initialShadowMapSize}
        shadow-mapSize-height={initialShadowMapSize}
      />
    </>
  );
}
