import { afterEach, describe, expect, it, vi } from 'vitest';
import { fullscreenSupported, toggleFullscreen } from '../src/ui/fullscreen';

const fakeDocument = ({ enabled = true, element = null as object | null, refuse = false } = {}) => {
  const result = () => (refuse ? Promise.reject(new Error('denied')) : Promise.resolve());
  const doc = {
    fullscreenEnabled: enabled,
    fullscreenElement: element,
    exitFullscreen: vi.fn(result),
    documentElement: { requestFullscreen: vi.fn(result) },
  };
  vi.stubGlobal('document', doc);
  return doc;
};

describe('fullscreen toggle', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is unsupported outside a browser', () => {
    expect(fullscreenSupported()).toBe(false);
    expect(() => toggleFullscreen()).not.toThrow();
  });

  it('is unsupported where element fullscreen is disabled or missing', () => {
    fakeDocument({ enabled: false });
    expect(fullscreenSupported()).toBe(false);
    const doc = fakeDocument();
    (doc.documentElement as { requestFullscreen?: unknown }).requestFullscreen = undefined;
    expect(fullscreenSupported()).toBe(false);
  });

  it('enters fullscreen without browser chrome', () => {
    const doc = fakeDocument();
    expect(fullscreenSupported()).toBe(true);
    toggleFullscreen();
    expect(doc.documentElement.requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' });
    expect(doc.exitFullscreen).not.toHaveBeenCalled();
  });

  it('leaves fullscreen when already in it', () => {
    const doc = fakeDocument({ element: {} });
    toggleFullscreen();
    expect(doc.exitFullscreen).toHaveBeenCalledOnce();
    expect(doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });

  it('does nothing when unsupported', () => {
    const doc = fakeDocument({ enabled: false });
    toggleFullscreen();
    expect(doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });

  it('swallows a refused request', async () => {
    const doc = fakeDocument({ refuse: true });
    toggleFullscreen();
    await expect(doc.documentElement.requestFullscreen.mock.results[0]!.value).rejects.toThrow();
  });
});
