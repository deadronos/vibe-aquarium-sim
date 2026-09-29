import { readBoolFromStorage } from './storageUtils';

export type ShaderLike = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
};

export type ShaderWithProgram = ShaderLike;

const logged = new Set<string>();

function shouldLogShaders() {
  return readBoolFromStorage('vibe.shaderDebug', false);
}

export function logShaderOnce(label: string, shader: ShaderLike) {
  if (logged.has(label)) return;
  if (!shouldLogShaders()) return;
  logged.add(label);

  console.groupCollapsed(`[shader] ${label}`);
  console.log('vertex:', shader.vertexShader ?? '(none)');
  console.log('fragment:', shader.fragmentShader ?? '(none)');
  console.groupEnd();
}
