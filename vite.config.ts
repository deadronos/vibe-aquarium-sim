import path from 'path';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { classifyDependencyChunk } from './src/performance/chunkClassification';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    // For GitHub Pages we need a sub-path base in production, but in dev it breaks HMR websockets.
    base: isBuild ? '/vibe-aquarium-sim/' : '/',
    plugins: [
      react(),
      babel({
        presets: [reactCompilerPreset()],
      }),
    ],
    server: {
      // Required for SharedArrayBuffer-based runtimes (threads) in modern browsers.
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    resolve: {
      alias: [
        {
          find: 'three/webgpu',
          replacement: path.resolve('node_modules/three/build/three.webgpu.js'),
        },
        { find: 'three/addons', replacement: path.resolve('node_modules/three/examples/jsm') },
      ],
    },
    optimizeDeps: {
      // multithreading uses a worker entry import that the dep optimizer can choke on in dev,
      // leading to missing prebundled worker modules and repeated worker crashes.
      exclude: ['multithreading'],
    },
    build: {
      rollupOptions: {
        output: {
          // Custom manual chunks to split large dependencies and keep the main bundle small.
          manualChunks: classifyDependencyChunk,
        },
      },
    },
  };
});
