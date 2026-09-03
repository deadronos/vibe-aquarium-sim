export type DependencyChunk = 'rapier' | 'r3f-drei' | 'vendor' | 'miniplex' | 'tweening';

export function classifyDependencyChunk(id: string): DependencyChunk | undefined {
  const normalized = id.replaceAll('\\', '/');
  const marker = '/node_modules/';
  const nodeModulesIndex = normalized.lastIndexOf(marker);
  if (nodeModulesIndex === -1) return undefined;

  const dependency = normalized.slice(nodeModulesIndex + marker.length);
  if (
    dependency.startsWith('@react-three/rapier/') ||
    dependency.startsWith('@dimforge/rapier3d-compat/') ||
    dependency.startsWith('@dimforge/rapier3d/')
  ) {
    return 'rapier';
  }
  if (
    dependency.startsWith('@react-three/') ||
    dependency.startsWith('drei/') ||
    dependency.startsWith('three-stdlib/')
  ) {
    return 'r3f-drei';
  }
  if (dependency.startsWith('three/')) return 'vendor';
  if (dependency.startsWith('miniplex/')) return 'miniplex';
  if (dependency.startsWith('zustand/')) return 'vendor';
  if (dependency.startsWith('tween/') || dependency.startsWith('gsap/')) return 'tweening';
  return 'vendor';
}
