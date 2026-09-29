import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type * as THREE from 'three';

import { AQUARIUM_PALETTE } from './config/artDirection';
import { AquariumCamera } from './components/AquariumCamera';
import { AquariumScene } from './components/AquariumScene';
import { AmbientParticles } from './components/AmbientParticles';
import { PostProcessing } from './components/PostProcessing';
import { RendererCanvas } from './components/RendererCanvas';
import { VisualQualityProvider } from './performance/VisualQualityProvider';
import { bootstrapRenderer, type RendererConfig } from './systems/renderer/rendererBootstrap';

export default function SimulationScene() {
  const directionalLightRef: MutableRefObject<THREE.DirectionalLight | null> =
    useRef<THREE.DirectionalLight | null>(null);
  const spotLightRef: MutableRefObject<THREE.SpotLight | null> = useRef<THREE.SpotLight | null>(
    null
  );
  const [rendererConfig, setRendererConfig] = useState<RendererConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void bootstrapRenderer(window.location.search, () => cancelled, setRendererConfig);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rendererConfig) return null;

  return (
    <VisualQualityProvider
      isWebGPU={rendererConfig.type === 'webgpu'}
      softwareWebGPU={rendererConfig.softwareWebGPU}
    >
      <RendererCanvas
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        shadows="percentage"
        rendererConfig={rendererConfig}
        setRendererConfig={setRendererConfig}
      >
        <color attach="background" args={[AQUARIUM_PALETTE.sceneBackground]} />
        <AquariumCamera />

        <AquariumScene
          directionalLightRef={directionalLightRef}
          spotLightRef={spotLightRef}
          initialShadowMapSize={rendererConfig.initialShadowMapSize}
        />

        <AmbientParticles />
        <PostProcessing isWebGPU={rendererConfig.type === 'webgpu'} />

        <OrbitControls makeDefault target={[0, 0, 0]} />
      </RendererCanvas>
    </VisualQualityProvider>
  );
}
