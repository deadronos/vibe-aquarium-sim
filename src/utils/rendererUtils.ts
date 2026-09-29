export interface WebGPUCapabilities {
  available: boolean;
  softwareAdapter: boolean;
}

/**
 * Detect WebGPU and identify software adapters that need a conservative effect profile.
 */
export async function getWebGPUCapabilities(): Promise<WebGPUCapabilities> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return { available: false, softwareAdapter: false };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { available: false, softwareAdapter: false };

    const info = (
      adapter as {
        info?: { vendor?: string; architecture?: string; device?: string; description?: string };
      }
    ).info;
    const identity = [info?.vendor, info?.architecture, info?.device, info?.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return { available: true, softwareAdapter: /swiftshader|llvmpipe|software/.test(identity) };
  } catch (e) {
    console.warn('WebGPU check failed:', e);
    return { available: false, softwareAdapter: false };
  }
}
