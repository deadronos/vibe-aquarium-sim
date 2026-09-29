import { readBoolFromStorage } from './storageUtils';

export type ShaderLike = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
};

export type ShaderWithProgram = ShaderLike;

/**
 * Minimal shader surface `logShaderOnce` actually reads.
 *
 * Deliberately looser than `ShaderLike`: the logger never touches `uniforms`,
 * so callers must not be forced to supply them. Keep this in sync with what
 * the logger dereferences — not with `ShaderLike`.
 */
export type LoggableShader = {
  vertexShader?: string;
  fragmentShader: string;
};

const logged = new Set<string>();

function shouldLogShaders() {
  return readBoolFromStorage('vibe.shaderDebug', false);
}

export function logShaderOnce(label: string, shader: LoggableShader) {
  if (logged.has(label)) return;
  if (!shouldLogShaders()) return;
  logged.add(label);

  console.groupCollapsed(`[shader] ${label}`);
  console.log('vertex:', shader.vertexShader ?? '(none)');
  console.log('fragment:', shader.fragmentShader ?? '(none)');
  console.groupEnd();
}
