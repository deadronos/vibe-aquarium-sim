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

  // eslint-disable-next-line no-console
  console.groupCollapsed(`[shader] ${label}`);
  // eslint-disable-next-line no-console
  console.log('vertex:', shader.vertexShader ?? '(none)');
  // eslint-disable-next-line no-console
  console.log('fragment:', shader.fragmentShader ?? '(none)');
  // eslint-disable-next-line no-console
  console.groupEnd();
}