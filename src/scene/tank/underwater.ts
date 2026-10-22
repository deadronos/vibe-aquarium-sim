import * as THREE from 'three';
import { PALETTE, TANK, TANK_ORIGIN } from '../../config/scene';

/** Uniforms shared by every material that lives under water. */
export const waterUniforms = {
  uTime: { value: 0 },
  uTankMin: {
    value: new THREE.Vector3(
      TANK_ORIGIN[0] - TANK.width / 2,
      TANK_ORIGIN[1],
      TANK_ORIGIN[2] - TANK.depth / 2
    ),
  },
  uTankMax: {
    value: new THREE.Vector3(
      TANK_ORIGIN[0] + TANK.width / 2,
      TANK_ORIGIN[1] + TANK.waterLevel,
      TANK_ORIGIN[2] + TANK.depth / 2
    ),
  },
  /** Per-channel absorption per metre: red fades first, like real water. */
  uAbsorb: { value: new THREE.Vector3(2.6, 1.05, 0.95) },
  uWaterColor: { value: new THREE.Color(PALETTE.water) },
  uTankLight: { value: 1 },
  uMoonLight: { value: 0 },
};

const VERTEX_HEAD = /* glsl */ `
varying vec3 vUwWorld;
uniform float uTime;
`;

const VERTEX_WORLD = /* glsl */ `
vec4 uwWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
uwWorld = instanceMatrix * uwWorld;
#endif
vUwWorld = (modelMatrix * uwWorld).xyz;
`;

const FRAGMENT_HEAD = /* glsl */ `
varying vec3 vUwWorld;
uniform float uTime;
uniform vec3 uTankMin;
uniform vec3 uTankMax;
uniform vec3 uAbsorb;
uniform vec3 uWaterColor;
uniform float uTankLight;
uniform float uMoonLight;

float uwCaustic(vec2 p, float t) {
  p *= 7.0;
  vec2 q = p + vec2(sin(p.y * 1.3 + t * 0.9), cos(p.x * 1.1 - t * 0.7)) * 0.7;
  float a = sin(q.x + t) * sin(q.y - t * 0.8);
  vec2 r = p * 1.6 + vec2(cos(q.y + t * 0.5), sin(q.x - t * 0.6));
  float b = sin(r.x - t * 0.6) * sin(r.y + t * 0.4);
  return pow(1.0 - clamp(abs(a + b * 0.7), 0.0, 1.0), 7.0);
}

vec3 uwAbsorb(vec3 color, vec3 p) {
  vec3 ro = cameraPosition;
  vec3 delta = p - ro;
  float len = length(delta);
  vec3 rd = delta / max(len, 1e-4);
  vec3 inv = 1.0 / rd;
  vec3 t0 = (uTankMin - ro) * inv;
  vec3 t1 = (uTankMax - ro) * inv;
  vec3 tmin = min(t0, t1);
  float tEnter = max(max(tmin.x, tmin.y), tmin.z);
  float dist = clamp(len - max(tEnter, 0.0), 0.0, 3.0);
  vec3 transmit = exp(-uAbsorb * dist);
  vec3 scatter = uWaterColor * (0.04 + uTankLight * 0.55) + vec3(0.02, 0.05, 0.16) * uMoonLight;
  return color * transmit + scatter * (1.0 - transmit);
}
`;

const FRAGMENT_APPLY = (caustics: boolean) => /* glsl */ `
${
  caustics
    ? `{
  vec3 uwNormal = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  float uwDepth = clamp((uTankMax.y - vUwWorld.y) / ${TANK.waterLevel.toFixed(3)}, 0.0, 1.0);
  float uwLight = uwCaustic(vUwWorld.xz, uTime * 0.8) * (1.0 - uwDepth * 0.55);
  outgoingLight += diffuseColor.rgb * uwLight * max(uwNormal.y, 0.0) * uTankLight * vec3(0.9, 1.0, 0.95) * 1.6;
}`
    : ''
}
outgoingLight = uwAbsorb(outgoingLight, vUwWorld);
#include <opaque_fragment>
`;

export interface UnderwaterOptions {
  caustics?: boolean;
  /** Extra GLSL declared in the vertex shader (attributes, uniforms). */
  vertexHead?: string;
  /** GLSL run right after `transformed` is set up, to deform geometry. */
  vertexDeform?: string;
  /** Extra uniforms for the deform code. */
  uniforms?: Record<string, THREE.IUniform>;
  key: string;
}

/** Patches a built-in lit material so it is tinted by the water between it and the camera. */
export const makeUnderwater = <T extends THREE.Material>(
  material: T,
  options: UnderwaterOptions
): T => {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, waterUniforms, options.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\n${VERTEX_HEAD}\n${options.vertexHead ?? ''}`
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${options.vertexDeform ?? ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_WORLD}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
      .replace('#include <opaque_fragment>', FRAGMENT_APPLY(options.caustics ?? false));
  };
  material.customProgramCacheKey = () => `underwater-${options.key}`;
  return material;
};
