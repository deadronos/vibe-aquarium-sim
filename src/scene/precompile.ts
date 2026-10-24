import type * as THREE from 'three';

/**
 * How long the veil waits for shaders. Software GL can take this long; past it, the veil lifts
 * and whatever is left compiles in the first frames, as it would without precompiling.
 */
export const PRECOMPILE_TIMEOUT_MS = 15_000;

type Compiler = Pick<THREE.WebGLRenderer, 'compile'> &
  Partial<Pick<THREE.WebGLRenderer, 'compileAsync'>>;

/**
 * Compiles every program the scene needs, in parallel where the GPU supports it, so the first
 * frames after the loading veil lifts do not stall on shader compiles. Never rejects: a renderer
 * without `compileAsync`, a failed compile or a compile that never settles only means the
 * remaining programs compile while rendering.
 */
export const precompile = async (
  gl: Compiler,
  scene: THREE.Scene,
  camera: THREE.Camera,
  timeoutMs = PRECOMPILE_TIMEOUT_MS
) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (typeof gl.compileAsync !== 'function') {
      gl.compile(scene, camera);
      return;
    }
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    });
    await Promise.race([gl.compileAsync(scene, camera), timeout]);
  } catch {
    // Rendering compiles whatever is missing.
  } finally {
    clearTimeout(timer);
  }
};
