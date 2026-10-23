import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useAquarium } from '../state/store';

/**
 * Reports a lost WebGL context (GPU reset, driver update, too many tabs) to the HUD and clears
 * it when the browser hands the context back. Three.js rebuilds its GPU state on restore.
 */
export const ContextWatcher = () => {
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const onLost = (event: Event) => {
      // Without preventDefault the browser never offers the context back.
      event.preventDefault();
      useAquarium.getState().setLoadError('context-lost');
    };
    const onRestored = () => {
      const store = useAquarium.getState();
      if (store.loadError === 'context-lost') store.setLoadError(null);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [canvas]);

  return null;
};
