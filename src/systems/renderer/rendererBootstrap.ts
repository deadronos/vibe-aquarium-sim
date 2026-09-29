import { getWebGPUCapabilities } from '../../utils/rendererUtils';
import {
  resolveRendererPreference,
  selectRenderer,
  setRendererStatus,
  toRendererBackend,
  type RendererKind,
} from '../../utils/rendererPolicy';
import { getQualityProfile } from '../../performance/qualityProfile';
import { getDeviceMaxDpr } from '../../performance/qualityPresets';
import { useQualityStore } from '../../performance/qualityStore';

export interface RendererConfig {
  ctor: new (...args: any[]) => any;
  type: RendererKind;
  initialShadowMapSize: number;
  softwareWebGPU: boolean;
}

/**
 * Resolves, initializes, and applies the renderer preference for the scene.
 *
 * WebGL is the safe default; WebGPU is an explicit opt-in. When WebGPU is
 * requested but unavailable (or its module fails to load) this publishes the
 * WebGL fallback status and reports the configured renderer through `onConfig`.
 */
export async function bootstrapRenderer(
  search: string,
  isCancelled: () => boolean,
  onConfig: (config: RendererConfig) => void
): Promise<void> {
  const requested = resolveRendererPreference(search);

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
      if (isCancelled()) return;
      onConfig({
        ctor: WebGPURenderer,
        type: 'webgpu',
        initialShadowMapSize: getQualityProfile(
          useQualityStore.getState().level,
          toRendererBackend(true),
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
  if (isCancelled()) return;
  onConfig({
    ctor: WebGLRenderer,
    type: 'webgl',
    initialShadowMapSize: getQualityProfile(
      useQualityStore.getState().level,
      toRendererBackend(false)
    ).shadowMapSize,
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
}
