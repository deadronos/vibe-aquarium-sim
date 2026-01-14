import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    // For GitHub Pages we need a sub-path base in production, but in dev it breaks HMR websockets.
    base: isBuild ? '/vibe-aquarium-sim/' : '/',
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
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
          // Force a single resolution of `three` to avoid multiple-instance warnings in tests
          { find: 'three', replacement: path.resolve(__dirname, 'node_modules/three') },
          // Also map deep imports like 'three/src/...' to the same package
          { find: /^three\/(.*)/, replacement: path.resolve(__dirname, 'node_modules/three/$1') },
        ],
      },
