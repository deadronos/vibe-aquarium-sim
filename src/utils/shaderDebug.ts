import { readBoolFromStorage } from './storageUtils';

type ShaderLike = {
  fragmentShader: string;
  vertexShader?: string;
};

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
