import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const TEST_THREE_WEBGPU_MOCK = path.resolve(__dirname, 'tests/__mocks__/three-webgpu.ts');
const TEST_THREE_TSL_MOCK = path.resolve(__dirname, 'tests/__mocks__/three-tsl.ts');
const DETECT_GPU_ESM = path.resolve(__dirname, 'node_modules/detect-gpu/dist/detect-gpu.esm.js');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'three/webgpu', replacement: TEST_THREE_WEBGPU_MOCK },
      { find: 'three/tsl', replacement: TEST_THREE_TSL_MOCK },
      { find: 'detect-gpu', replacement: DETECT_GPU_ESM },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    watch: false,
  },
});
