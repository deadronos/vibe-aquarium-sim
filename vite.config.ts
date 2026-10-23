import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

const pathSeparator = /[\\/]/;

/**
 * Match a package at the `node_modules` boundary.
 * `react` must not capture `@react-three`, and `three` must not capture `three-stdlib`.
 */
const packageNameFromId = (id: string) => {
  const parts = id.split(pathSeparator);
  const nodeModules = parts.lastIndexOf('node_modules');
  if (nodeModules < 0) return null;
  const name = parts[nodeModules + 1];
  if (!name) return null;
  return name.startsWith('@') ? `${name}/${parts[nodeModules + 2] ?? ''}` : name;
};

const isPackage = (id: string, packages: readonly string[]) => {
  const packageName = packageNameFromId(id);
  return packageName !== null && packages.includes(packageName);
};

/** App source, or a virtual bundler module. Used by the chunk manifest, not for grouping. */
const moduleOwner = (id: string) => {
  const packageName = packageNameFromId(id);
  if (packageName) return packageName;
  if (id.split(pathSeparator).includes('src')) return 'app';
  return 'virtual';
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
        // These are shared with the app. Leaving them in the entry makes `r3f` import the
        // app chunk while the app chunk imports `r3f`, which has produced TDZ errors on Pages.
        'zustand',
        'use-sync-external-store',
        '@babel/runtime',
      ]),
    priority: 10,
  },
];

/** Records which packages landed in each chunk so the budget check is not matching minified source. */
const chunkManifest = (): Plugin => ({
  name: 'chunk-manifest',
  generateBundle(options, bundle) {
    const chunks: Record<string, string[]> = {};
    for (const output of Object.values(bundle)) {
      if (output.type !== 'chunk') continue;
      const owners = new Set<string>();
      for (const id of Object.keys(output.modules)) owners.add(moduleOwner(id));
      chunks[output.fileName] = [...owners].sort();
    }
    const directory = options.dir ?? path.resolve('dist');
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'chunk-manifest.json'), JSON.stringify(chunks, null, 2));
  },
});

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves from a sub-path in production; dev stays at the root so HMR works.
  base: command === 'build' ? '/vibe-aquarium-sim/' : '/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), chunkManifest()],
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
