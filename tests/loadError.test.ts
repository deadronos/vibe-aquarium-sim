import { beforeEach, describe, expect, it } from 'vitest';
import { useAquarium } from '../src/state/store';

const initial = useAquarium.getState();

describe('load error state', () => {
  beforeEach(() => useAquarium.setState(initial, true));

  it('starts without an error outside a browser', () => {
    expect(useAquarium.getState().loadError).toBeNull();
  });

  it('records a failure and clears it on retry, bumping the attempt', () => {
    const store = useAquarium.getState();
    store.setLoadError('assets');
    expect(useAquarium.getState().loadError).toBe('assets');
    store.retryLoad();
    expect(useAquarium.getState().loadError).toBeNull();
    expect(useAquarium.getState().loadAttempt).toBe(initial.loadAttempt + 1);
  });

  it('lets late fish clear a timeout but not a failure', () => {
    useAquarium.getState().setLoadError('timeout');
    useAquarium.getState().setReady();
    expect(useAquarium.getState()).toMatchObject({ ready: true, loadError: null });

    useAquarium.getState().setLoadError('crash');
    useAquarium.getState().setReady();
    expect(useAquarium.getState().loadError).toBe('crash');
  });

  it('never replaces missing WebGL', () => {
    useAquarium.setState({ loadError: 'webgl' });
    useAquarium.getState().setLoadError('context-lost');
    useAquarium.getState().setLoadError(null);
    useAquarium.getState().retryLoad();
    expect(useAquarium.getState().loadError).toBe('webgl');
  });
});
