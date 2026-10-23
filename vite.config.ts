import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

const pathSeparator = /[\\/]/;

/**
 * Match a package at the `node_modules` boundary.
 * `react` must not capture `@react-three`, and `three` must not capture `three-stdlib`.
 */
const isPackage = (id: string, packages: readonly string[]) => {
  const parts = id.split(pathSeparator);
  const nodeModules = parts.lastIndexOf('node_modules');
  if (nodeModules < 0) return false;
  const name = parts[nodeModules + 1];
  if (!name) return false;
  const packageName = name.startsWith('@') ? `${name}/${parts[nodeModules + 2] ?? ''}` : name;
  return packages.includes(packageName);
};

const isReactThree = (id: string) => {
  const parts = id.split(pathSeparator);
  const nodeModules = parts.lastIndexOf('node_modules');
  return nodeModules >= 0 && parts[nodeModules + 1] === '@react-three';
};

/**
 * Rolldown turns `manualChunks` into one group that also swallows that group's
 * dependencies, so Three's renderer landed in the chunk named `postprocessing`.
 * These groups match packages themselves. Recursive capture stays off: otherwise the
 * postprocessing group absorbs Fiber (which the first paint needs) and the browser
 * preloads the post stack for Lite too. Higher priority wins when a module matches
 * two groups, so `@react-three/postprocessing` stays out of `r3f`.
 */
const vendorGroups = [
  {
    name: 'three',
    test: (id: string) => isPackage(id, ['three']),
    priority: 40,
  },
  {
    name: 'react',
    test: (id: string) => isPackage(id, ['react', 'react-dom', 'scheduler']),
    priority: 30,
  },
  {
    name: 'postprocessing',
    test: (id: string) => isPackage(id, ['postprocessing', '@react-three/postprocessing', 'maath']),
    priority: 20,
  },
  {
    name: 'r3f',
    // Fiber, Drei, and the Drei/Fiber helpers that are only there to support them.
    // `maath` is omitted: this app reaches it through the post stack, which is lazy.
    test: (id: string) =>
      isReactThree(id) ||
      isPackage(id, [
        'three-stdlib',
        '@monogrid/gainmap-js',
        'camera-controls',
        'fflate',
        'suspend-react',
        'its-fine',
        'react-use-measure',
      ]),
    priority: 10,
  },
];

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves from a sub-path in production; dev stays at the root so HMR works.
  base: command === 'build' ? '/vibe-aquarium-sim/' : '/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  build: {
    // Three's renderer is one large cached chunk. Stay above it so a clean build is quiet.
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: vendorGroups,
        },
      },
    },
  },
}));
