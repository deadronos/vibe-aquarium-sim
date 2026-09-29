import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import * as THREE from 'three';
import { getWebGPUCapabilities } from './utils/rendererUtils';
import {
  createWebGLRendererConfig,
  isWebGPURendererBackend,
  resolveRendererPreference,
  selectRenderer,
  setRendererStatus,
  type RendererKind,
} from './utils/rendererPolicy';
import { EnvironmentMap } from './components/EnvironmentMap';
import { LivingRoom } from './components/LivingRoom';

import { ECS, world } from './store';
import type { Entity } from './store';

import { Tank } from './components/Tank';
import { Water } from './components/Water';
import { Fish } from './components/Fish';
import { Food } from './components/Food';
import { Decoration } from './components/Decoration';
import { FeedingController } from './components/FeedingController';
import { EffectsManager } from './components/EffectsManager';
import { AmbientParticles } from './components/AmbientParticles';
import { PostProcessing } from './components/PostProcessing';

import { FishRenderSystem } from './systems/FishRenderSystem';
import { BoidsSystem } from './systems/BoidsSystem';
import { ExcitementSystem } from './systems/ExcitementSystem';
import { SchedulerSystem } from './systems/SchedulerSystem';

import { AdaptiveQualityManager } from './performance/AdaptiveQualityManager';
import { VisualQualityProvider } from './performance/VisualQualityProvider';
import { useVisualQuality } from './performance/VisualQualityContext';
import { getQualityProfile } from './performance/qualityProfile';
import { getDeviceMaxDpr } from './performance/qualityPresets';
import { useQualityStore } from './performance/qualityStore';
import { Spawner } from './systems/Spawner';
import { AQUARIUM_PALETTE, ART_DIRECTION_LIGHTING } from './config/artDirection';
import { AquariumCamera } from './components/AquariumCamera';
import { TestHarnessDriver } from './systems/TestHarnessDriver';
import { isTestHarnessEnabled } from './utils/testHarness';

function SceneLights({
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

export default function SimulationScene() {
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const spotLightRef = useRef<THREE.SpotLight | null>(null);
  const [rendererConfig, setRendererConfig] = useState<{
    ctor: new (...args: any[]) => any;
    type: RendererKind;
    initialShadowMapSize: number;
    softwareWebGPU: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const requested = resolveRendererPreference(window.location.search);

    const initializeRenderer = async () => {
      const webgpuCapabilities =
        requested === 'webgpu'
          ? await getWebGPUCapabilities()
          : { available: false, softwareAdapter: false };
      const selected = selectRenderer(requested, webgpuCapabilities.available);

      if (selected === 'webgpu') {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - WebGPU types might be missing in some setups
          const { WebGPURenderer } = await import('three/webgpu');
          if (cancelled) return;
          setRendererConfig({
            ctor: WebGPURenderer,
            type: 'webgpu',
            initialShadowMapSize: getQualityProfile(
              useQualityStore.getState().level,
              'webgpu',
              getDeviceMaxDpr(),
              webgpuCapabilities.softwareAdapter
            ).shadowMapSize,
            softwareWebGPU: webgpuCapabilities.softwareAdapter,
          });
          return;
        } catch (error) {
          console.warn(
            '[vibe] Renderer: WebGPU initialization unavailable; falling back to WebGL',
            error
          );
        }
      }

      const { WebGLRenderer } = await import('three');
      if (cancelled) return;
      setRendererConfig({
        ctor: WebGLRenderer,
        type: 'webgl',
        initialShadowMapSize: getQualityProfile(useQualityStore.getState().level, 'webgl')
          .shadowMapSize,
        softwareWebGPU: false,
      });
      setRendererStatus({
        requested,
        selected: 'webgl',
        fallback: requested === 'webgpu',
      });
      if (requested === 'webgpu') {
        console.info('[vibe] Renderer: WebGPU unavailable; using WebGL fallback');
      }
    };

    void initializeRenderer();
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
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        shadows="percentage"
        gl={async (props) => {
          const Renderer = rendererConfig.ctor;
          let activeRendererType = rendererConfig.type;
          let renderer = new Renderer(createWebGLRendererConfig(props));

          const fallbackToWebGL = async () => {
            renderer.dispose?.();
            const { WebGLRenderer } = await import('three');
            renderer = new WebGLRenderer(createWebGLRendererConfig(props));
            activeRendererType = 'webgl';
            setRendererConfig({
              ctor: WebGLRenderer,
              type: 'webgl',
              initialShadowMapSize: getQualityProfile(useQualityStore.getState().level, 'webgl')
                .shadowMapSize,
              softwareWebGPU: false,
            });
            setRendererStatus({
              requested: 'webgpu',
              selected: 'webgl',
              fallback: true,
            });
          };

          if (rendererConfig.type === 'webgpu' && typeof renderer.init === 'function') {
            try {
              await renderer.init();
              if (!isWebGPURendererBackend(renderer)) {
                console.warn(
                  '[vibe] Renderer: WebGPU wrapper selected a non-WebGPU backend; using WebGL'
                );
                await fallbackToWebGL();
              } else {
                setRendererStatus({
                  requested: 'webgpu',
                  selected: 'webgpu',
                  fallback: false,
                });
                console.info('[vibe] Renderer: WebGPU opt-in selected');
              }
            } catch (error) {
              console.warn('[vibe] Renderer: WebGPU init failed; using WebGL fallback', error);
              await fallbackToWebGL();
            }
          }

          if (rendererConfig.type === 'webgl' && window.__vibe_rendererStatus?.fallback !== true) {
            setRendererStatus({
              requested: 'webgl',
              selected: 'webgl',
              fallback: false,
            });
          }

          // Apply common configurations
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = ART_DIRECTION_LIGHTING.exposure;
          renderer.outputColorSpace = THREE.SRGBColorSpace;

          // If using WebGL renderer, detect whether the context is WebGL2 and log it
          if (activeRendererType === 'webgl') {
            try {
              // `getContext` is available on WebGLRenderer
              // Use `instanceof` guard in case WebGL2 isn't available in the environment
              const getContext = (renderer as unknown as { getContext?: () => unknown }).getContext;
              const gl = getContext ? getContext() : null;
              const isWebGL2 =
                typeof WebGL2RenderingContext !== 'undefined' &&
                gl instanceof WebGL2RenderingContext;
              if (isWebGL2) {
                console.info('[vibe] Renderer: WebGL2 (using WebGLRenderer with WebGL2 context)');
              }
            } catch {
              // Non-fatal: logging should not crash the renderer initialization
            }
          }

          return renderer;
        }}
      >
        <color attach="background" args={[AQUARIUM_PALETTE.sceneBackground]} />
        <AquariumCamera />

        <Physics gravity={[0, -9.81, 0]}>
          <AdaptiveQualityManager
            directionalLightRef={directionalLightRef}
            spotLightRef={spotLightRef}
          />
          <LivingRoom />
          {/* Broad room light stays quiet so the tank remains the focal plane. */}
          <hemisphereLight
            color={ART_DIRECTION_LIGHTING.hemisphereSky}
            groundColor={ART_DIRECTION_LIGHTING.hemisphereGround}
            intensity={ART_DIRECTION_LIGHTING.hemisphereIntensity}
          />
          <SceneLights
            directionalLightRef={directionalLightRef}
            spotLightRef={spotLightRef}
            initialShadowMapSize={rendererConfig.initialShadowMapSize}
          />
          {/* Cool fill from the tank side keeps fish readable without a neon rim. */}
          <pointLight
            position={[-2, -1.5, -2]}
            intensity={ART_DIRECTION_LIGHTING.waterFillIntensity}
            color={ART_DIRECTION_LIGHTING.waterFillColor}
          />
          {/* Environment map for realistic PBR reflections */}
          {/* Environment map for realistic PBR reflections */}
          {/* Use manual loader to avoid deprecated RGBELoader in drei preset */}
          <EnvironmentMap />

          <Tank />
          <Water />

          <Spawner />
          <SchedulerSystem />
          <BoidsSystem />
          <ExcitementSystem />
          <FishRenderSystem />

          <ECS.Entities in={world.with('isFish')}>
            {(entity: Entity) => <Fish entity={entity} />}
          </ECS.Entities>

          <ECS.Entities in={world.with('isFood')}>
            {(entity: Entity) => <Food entity={entity} />}
          </ECS.Entities>

          <ECS.Entities in={world.with('isDecoration')}>
            {(entity: Entity) => <Decoration entity={entity} />}
          </ECS.Entities>

          <FeedingController />
          <EffectsManager />
          {isTestHarnessEnabled() && <TestHarnessDriver />}
        </Physics>

        <AmbientParticles />
        <PostProcessing isWebGPU={rendererConfig.type === 'webgpu'} />

        <OrbitControls makeDefault target={[0, 0, 0]} />
      </Canvas>
    </VisualQualityProvider>
  );
}
