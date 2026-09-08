import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWebGPUCapabilities } from '../src/utils/rendererUtils';

describe('getWebGPUCapabilities', () => {
  const originalGpu = Object.getOwnPropertyDescriptor(navigator, 'gpu');

  afterEach(() => {
    if (originalGpu) Object.defineProperty(navigator, 'gpu', originalGpu);
    else Reflect.deleteProperty(navigator, 'gpu');
  });

  it('identifies SwiftShader as a software adapter', async () => {
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: {
        requestAdapter: vi.fn(async () => ({
          info: { vendor: 'google', architecture: 'swiftshader', device: '', description: '' },
        })),
      },
    });

    await expect(getWebGPUCapabilities()).resolves.toEqual({
      available: true,
      softwareAdapter: true,
    });
  });

  it('keeps native adapters on the full quality path', async () => {
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: {
        requestAdapter: vi.fn(async () => ({
          info: { vendor: 'apple', architecture: 'gpu', device: 'M4', description: 'Metal' },
        })),
      },
    });

    await expect(getWebGPUCapabilities()).resolves.toEqual({
      available: true,
      softwareAdapter: false,
    });
  });
});
