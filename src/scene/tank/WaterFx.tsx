import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../../config/scene';
import { createRandom } from '../../sim/random';
import { makeUnderwater, waterUniforms } from './underwater';

const BUBBLES = 56;
const STONE = { x: -0.52, z: -0.16 };
const dummy = new THREE.Object3D();

/** Air-stone bubble stream rising behind the left planting. */
const Bubbles = () => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const state = useMemo(() => {
    const random = createRandom(77);
    return {
      y: Float32Array.from({ length: BUBBLES }, () => random.range(0.05, TANK.waterLevel)),
      size: Float32Array.from({ length: BUBBLES }, () => random.range(0.0018, 0.0045)),
      seed: Float32Array.from({ length: BUBBLES }, () => random.range(0, 100)),
      random,
    };
  }, []);
  const material = useMemo(
    () =>
      makeUnderwater(
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.05,
          transparent: true,
          opacity: 0.6,
          emissive: '#bfe7ef',
          emissiveIntensity: 0.25,
        }),
        { key: 'bubble' }
      ),
    []
  );
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = waterUniforms.uTime.value;
    for (let i = 0; i < BUBBLES; i++) {
      const size = state.size[i]!;
      let y = state.y[i]! + dt * (0.12 + size * 30);
      if (y > TANK.waterLevel - size) {
        y = 0.06;
        state.seed[i] = state.random.range(0, 100);
      }
      state.y[i] = y;
      const s = state.seed[i]!;
      const rise = y - 0.06;
      dummy.position.set(
        STONE.x + Math.sin(t * 7 + s) * 0.004 + rise * 0.05 * Math.sin(s),
        y,
        STONE.z + Math.cos(t * 6 + s) * 0.004 + rise * 0.04
      );
      dummy.scale.set(size * 1.15, size * 0.85, size * 1.15);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    }
    mesh.current!.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, material, BUBBLES]}
      frustumCulled={false}
      renderOrder={4}
    >
      <sphereGeometry args={[1, 10, 8]} />
    </instancedMesh>
  );
};

/** Fine suspended particles that catch the light; animated entirely on the GPU. */
const Motes = () => {
  const geometry = useMemo(() => {
    const random = createRandom(55);
    const count = 260;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = random.range(-TANK.width / 2 + 0.02, TANK.width / 2 - 0.02);
      positions[i * 3 + 1] = random.range(0.06, TANK.waterLevel - 0.01);
      positions[i * 3 + 2] = random.range(-TANK.depth / 2 + 0.02, TANK.depth / 2 - 0.02);
      seeds[i] = random.range(0, 100);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: waterUniforms.uTime,
          uTankLight: waterUniforms.uTankLight,
          uPixelRatio: { value: 1 },
        },
        vertexShader: /* glsl */ `
          attribute float seed;
          uniform float uTime;
          uniform float uPixelRatio;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            p.x += sin(uTime * 0.13 + seed) * 0.03;
            p.y += sin(uTime * 0.09 + seed * 1.7) * 0.02;
            p.z += cos(uTime * 0.11 + seed * 0.7) * 0.02;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = max(1.0, (0.0012 + fract(seed) * 0.0015) * 900.0 * uPixelRatio / -mv.z);
            vAlpha = 0.15 + 0.35 * fract(seed * 3.7);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTankLight;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * vAlpha * (0.15 + uTankLight * 0.85);
            gl_FragColor = vec4(vec3(0.85, 0.95, 0.9), a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  useFrame((state) => {
    material.uniforms.uPixelRatio!.value = state.gl.getPixelRatio();
  });
  return <points geometry={geometry} material={material} renderOrder={7} frustumCulled={false} />;
};

/** Soft additive light shafts from the LED fixture. */
const LightShafts = () => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: waterUniforms.uTime, uTankLight: waterUniforms.uTankLight },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying float vSeed;
          void main() {
            vUv = uv;
            vSeed = instanceMatrix[3].x * 13.0;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uTankLight;
          varying vec2 vUv;
          varying float vSeed;
          void main() {
            float across = exp(-pow((vUv.x - 0.5) * 3.2, 2.0));
            float down = smoothstep(0.0, 0.6, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
            float flicker = 0.6 + 0.4 * sin(uTime * 0.7 + vSeed + vUv.y * 3.0);
            float a = across * down * flicker * uTankLight * 0.07;
            gl_FragColor = vec4(vec3(0.85, 0.97, 1.0) * a, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    []
  );
  const SHAFTS = 7;
  return (
    <instancedMesh
      ref={(node) => {
        if (!node) return;
        const random = createRandom(3);
        for (let i = 0; i < SHAFTS; i++) {
          dummy.position.set(
            -0.48 + (i / (SHAFTS - 1)) * 0.96 + random.range(-0.05, 0.05),
            TANK.waterLevel / 2,
            random.range(-0.08, 0.1)
          );
          dummy.rotation.set(0, random.range(-0.4, 0.4), random.range(-0.12, 0.12));
          dummy.scale.set(random.range(0.08, 0.16), TANK.waterLevel, 1);
          dummy.updateMatrix();
          node.setMatrixAt(i, dummy.matrix);
        }
        node.instanceMatrix.needsUpdate = true;
      }}
      args={[undefined, material, SHAFTS]}
      renderOrder={8}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
};

export const WaterFx = () => (
  <group position={TANK_ORIGIN as unknown as [number, number, number]}>
    <Bubbles />
    <Motes />
    <LightShafts />
  </group>
);
