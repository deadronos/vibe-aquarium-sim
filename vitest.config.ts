import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'three', replacement: path.resolve(__dirname, 'node_modules/three') },
      { find: /^three\/(.*)/, replacement: path.resolve(__dirname, 'node_modules/three/$1') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    watch: false,
    deps: {
      inline: ['three'],
    },
  },
});
