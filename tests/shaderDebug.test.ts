import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function stubWindow(localStorage: unknown) {
  vi.stubGlobal('window', {
    localStorage,
    matchMedia: vi.fn().mockReturnValue({ matches: false }),
  });
}

describe('shaderDebug', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not warn when imported without a usable storage interface', async () => {
    stubWindow({});

    await import('../src/utils/shaderDebug');

    expect(console.warn).not.toHaveBeenCalled();
  });

  it('logs once when shader debug is enabled in storage', async () => {
    const getItem = vi.fn().mockReturnValue('true');
    stubWindow({
      getItem,
      setItem: vi.fn(),
    });

    const { logShaderOnce } = await import('../src/utils/shaderDebug');

    logShaderOnce('Test/Shader', {
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
    });
    logShaderOnce('Test/Shader', {
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
    });

    expect(getItem).toHaveBeenCalledTimes(1);
    expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.groupEnd).toHaveBeenCalledTimes(1);
  });
});
