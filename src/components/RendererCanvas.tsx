import { Canvas } from '@react-three/fiber';
import type { CanvasProps } from '@react-three/fiber';
import * as THREE from 'three';

import {
  createWebGLRendererConfig,
  isWebGPURendererBackend,
  setRendererStatus,
  toRendererBackend,
} from '../utils/rendererPolicy';
import { getQualityProfile } from '../performance/qualityProfile';
import { useQualityStore } from '../performance/qualityStore';
import { ART_DIRECTION_LIGHTING } from '../config/artDirection';
import type { RendererConfig } from '../systems/renderer/rendererBootstrap';

interface RendererCanvasProps extends CanvasProps {
  rendererConfig: RendererConfig;
  setRendererConfig: (config: RendererConfig) => void;
}

function createRendererGl(
  rendererConfig: RendererConfig,
  setRendererConfig: (config: RendererConfig) => void
) {
  return async (props: any) => {
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
        initialShadowMapSize: getQualityProfile(
          useQualityStore.getState().level,
          toRendererBackend(false)
        ).shadowMapSize,
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
          typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        if (isWebGL2) {
          console.info('[vibe] Renderer: WebGL2 (using WebGLRenderer with WebGL2 context)');
        }
      } catch {
        // Non-fatal: logging should not crash the renderer initialization
      }
    }

    return renderer;
  };
}

export function RendererCanvas({
  rendererConfig,
  setRendererConfig,
  ...canvasProps
}: RendererCanvasProps) {
  return <Canvas {...canvasProps} gl={createRendererGl(rendererConfig, setRendererConfig)} />;
}
