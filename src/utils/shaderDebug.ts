import { readBoolFromStorage } from './storageUtils';

type ShaderLike = {
  fragmentShader: string;
  vertexShader?: string;
};

const SHOULD_LOG = readBoolFromStorage('vibe.shaderDebug', false);
const logged = new Set<string>();

export function logShaderOnce(label: string, shader: ShaderLike) {
  if (!SHOULD_LOG) return;
  if (logged.has(label)) return;
  logged.add(label);

  console.groupCollapsed(`[shader] ${label}`);
  console.log('vertex:', shader.vertexShader ?? '(none)');
  console.log('fragment:', shader.fragmentShader ?? '(none)');
  console.groupEnd();
}