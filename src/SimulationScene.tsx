import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import * as THREE from 'three';
import { supportsWebGPU } from './utils/rendererUtils';
import {
  isWebGPURendererBackend,
  resolveRendererPreference,
  selectRenderer,
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
import { useQualityStore } from './performance/qualityStore';
import { Spawner } from './systems/Spawner';

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
        position={[1.5, 3, 1]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={initialShadowMapSize}
        shadow-mapSize-height={initialShadowMapSize}
      />
      {/* Soft spot to add depth & visible speculars */}
      <spotLight
        ref={spotLightRef}
        position={[2, 4, 2]}
        angle={0.6}
        penumbra={0.6}
        intensity={1.2}
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
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const requested = resolveRendererPreference(window.location.search);

    const initializeRenderer = async () => {
      const webgpuAvailable = requested === 'webgpu' ? await supportsWebGPU() : false;
      const selected = selectRenderer(requested, webgpuAvailable);

      if (selected === 'webgpu') {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - WebGPU types might be missing in some setups
          const { WebGPURenderer } = await import('three/webgpu');
          if (cancelled) return;
          setRendererConfig({
            ctor: WebGPURenderer,
            type: 'webgpu',
            initialShadowMapSize: getQualityProfile(useQualityStore.getState().level, 'webgpu')
              .shadowMapSize,
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
      });
      window.__vibe_rendererStatus = {
        requested,
        selected: 'webgl',
        fallback: requested === 'webgpu',
      };
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
    <VisualQualityProvider isWebGPU={rendererConfig.type === 'webgpu'}>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        shadows="percentage"
        gl={async (props) => {
          const Renderer = rendererConfig.ctor;
          let activeRendererType = rendererConfig.type;
          let renderer = new Renderer({
            ...props,
            powerPreference: 'high-performance',
            antialias: true,
            alpha: true,
          });

          const fallbackToWebGL = async () => {
            renderer.dispose?.();
            const { WebGLRenderer } = await import('three');
            renderer = new WebGLRenderer({
              ...props,
              powerPreference: 'high-performance',
              antialias: true,
              alpha: true,
            });
            activeRendererType = 'webgl';
            setRendererConfig({
              ctor: WebGLRenderer,
              type: 'webgl',
              initialShadowMapSize: getQualityProfile(useQualityStore.getState().level, 'webgl')
                .shadowMapSize,
            });
            window.__vibe_rendererStatus = {
              requested: 'webgpu',
              selected: 'webgl',
              fallback: true,
            };
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
                window.__vibe_rendererStatus = {
                  requested: 'webgpu',
                  selected: 'webgpu',
                  fallback: false,
                };
                console.info('[vibe] Renderer: WebGPU opt-in selected');
              }
            } catch (error) {
              console.warn('[vibe] Renderer: WebGPU init failed; using WebGL fallback', error);
              await fallbackToWebGL();
            }
          }

          if (rendererConfig.type === 'webgl' && window.__vibe_rendererStatus?.fallback !== true) {
            window.__vibe_rendererStatus = {
              requested: 'webgl',
              selected: 'webgl',
              fallback: false,
            };
          }

          // Apply common configurations
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.0;
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
        <color attach="background" args={['#0a0a0a']} />

        <Physics gravity={[0, -9.81, 0]}>
          <AdaptiveQualityManager
            directionalLightRef={directionalLightRef}
            spotLightRef={spotLightRef}
          />
          <LivingRoom />
          {/* Gentle indoor ambient */}
          <hemisphereLight color={0xdcdce0} groundColor={0x8a7c6f} intensity={0.5} />
          <SceneLights
            directionalLightRef={directionalLightRef}
            spotLightRef={spotLightRef}
            initialShadowMapSize={rendererConfig.initialShadowMapSize}
          />
          {/* Cool fill from back */}
          <pointLight position={[-2, -2, -2]} intensity={0.5} color="#004488" />
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
        </Physics>

        <AmbientParticles />
        <PostProcessing isWebGPU={rendererConfig.type === 'webgpu'} />

        <OrbitControls target={[0, 0, 0]} />
      </Canvas>
    </VisualQualityProvider>
  );
}
