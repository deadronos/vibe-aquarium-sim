import * as THREE from 'three';
import { waterUniforms } from './underwater';

const surfaceVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const surfaceFragment = /* glsl */ `
uniform float uTime;
uniform float uTankLight;
uniform float uMoonLight;
uniform vec3 uWaterColor;
uniform samplerCube uRoomReflection;
uniform float uRoomReflectionStrength;
varying vec3 vWorld;

float ripple(vec2 p, float t) {
  float a = sin(p.x * 31.0 + t * 1.7 + sin(p.y * 23.0 - t));
  float b = sin(p.y * 37.0 - t * 1.3 + sin(p.x * 19.0 + t * 0.7));
  float c = sin((p.x + p.y) * 53.0 + t * 2.3);
  return (a + b) * 0.35 + c * 0.15;
}

void main() {
  float r = ripple(vWorld.xz, uTime);
  float glint = smoothstep(0.45, 0.9, r);
  vec3 lit = vec3(0.85, 0.97, 1.0) * uTankLight + vec3(0.15, 0.3, 0.75) * uMoonLight * 0.35;
  vec3 color;
  float alpha;
  if (gl_FrontFacing) {
    // Seen from above: a faint sheen.
    color = uWaterColor * 0.6 + lit * glint * 0.35;
    alpha = 0.22 + glint * 0.2;
  } else {
    // Seen from below: total internal reflection makes the underside a bright, wavering mirror.
    color = mix(uWaterColor * 1.4, vec3(0.75, 0.92, 0.95), 0.35) * (0.15 + 0.85 * uTankLight) + lit * glint * 0.9;
    alpha = 0.72 + glint * 0.2;
  }
  vec3 normal = normalize(vec3(r * 0.045, gl_FrontFacing ? 1.0 : -1.0, -r * 0.035));
  vec3 reflected = reflect(normalize(vWorld - cameraPosition), normal);
  vec3 room = textureCube(uRoomReflection, reflected).rgb;
  color = mix(color, room, uRoomReflectionStrength * (gl_FrontFacing ? 0.22 : 0.08));
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
`;

export const createWaterSurfaceMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: waterUniforms.uTime,
      uTankLight: waterUniforms.uTankLight,
      uMoonLight: waterUniforms.uMoonLight,
      uWaterColor: waterUniforms.uWaterColor,
      uRoomReflection: waterUniforms.uRoomReflection,
      uRoomReflectionStrength: waterUniforms.uRoomReflectionStrength,
    },
    vertexShader: surfaceVertex,
    fragmentShader: surfaceFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
