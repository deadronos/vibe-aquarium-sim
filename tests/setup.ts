import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const defineGlobalIfMissing = <T>(key: string, value: T) => {
  if (!(key in globalThis)) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
};

defineGlobalIfMissing('GPUShaderStage', { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
defineGlobalIfMissing('GPUMapMode', { READ: 1, WRITE: 2 });
defineGlobalIfMissing('GPUBufferUsage', {
  MAP_READ: 1,
  MAP_WRITE: 2,
  COPY_SRC: 4,
  COPY_DST: 8,
  INDEX: 16,
  VERTEX: 32,
  UNIFORM: 64,
  STORAGE: 128,
  INDIRECT: 256,
  QUERY_RESOLVE: 512,
});
defineGlobalIfMissing('GPUTextureUsage', {
  COPY_SRC: 1,
  COPY_DST: 2,
  TEXTURE_BINDING: 4,
  STORAGE_BINDING: 8,
  RENDER_ATTACHMENT: 16,
});
defineGlobalIfMissing('GPUColorWrite', {
  RED: 1,
  GREEN: 2,
  BLUE: 4,
  ALPHA: 8,
  ALL: 15,
});

vi.mock('detect-gpu', () => ({
  getGPUTier: vi.fn(async () => ({
    tier: 3,
    type: 'WEBGL',
    isMobile: false,
    fps: 60,
    gpu: 'vitest-mock-gpu',
  })),
}));

const _origConsoleError = console.error;
const _origConsoleWarn = console.warn;
console.error = (...args: unknown[]) => {
  try {
    const msg = String(args[0] ?? '');
    if (msg === 'THREE.WARNING: Multiple instances of Three.js being imported.') return;
  } catch {
    /* ignore */
  }
  return (_origConsoleError as (...a: unknown[]) => void).apply(console, args);
};
console.warn = (...args: unknown[]) => {
  try {
    const msg = String(args[0] ?? '');
    if (msg === 'THREE.WARNING: Multiple instances of Three.js being imported.') return;
  } catch {
    /* ignore */
  }
  return (_origConsoleWarn as (...a: unknown[]) => void).apply(console, args);
};
