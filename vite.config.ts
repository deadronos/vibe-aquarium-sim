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
    optimizeDeps: {
      // multithreading uses a worker entry import that the dep optimizer can choke on in dev,
      // leading to missing prebundled worker modules and repeated worker crashes.
      exclude: ['multithreading'],
    },
  };
});
