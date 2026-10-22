import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

const vendorChunk = (id: string) => {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('/three/')) return 'three';
  if (id.includes('postprocessing')) return 'postprocessing';
  if (id.includes('@react-three')) return 'r3f';
  if (id.includes('react')) return 'react';
  return undefined;
};

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves from a sub-path in production; dev stays at the root so HMR works.
  base: command === 'build' ? '/vibe-aquarium-sim/' : '/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  build: {
    // postprocessing ships as one large module; it is cached separately from app code.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: { manualChunks: vendorChunk },
    },
  },
}));
