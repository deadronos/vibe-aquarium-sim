import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../../config/scene';
import { daylight } from '../daylight';
import { simulation } from '../fish/simulation';
import { backdropTexture } from '../textures';
import { makeUnderwater, waterUniforms } from './underwater';
import { useDispose } from '../dispose';

const { width: W, height: H, depth: D, glass: G, waterLevel: WL } = TANK;
const FIXTURE_Y = H + 0.13;

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
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
`;

const glassMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: '#eef7f4',
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    envMapIntensity: 1.6,
    specularIntensity: 1,
  });

const edgeMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: '#7fbfa8',
    roughness: 0.1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

const pipe = (points: [number, number, number][], radius: number) =>
  new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      'catmullrom',
      0.1
    ),
    48,
    radius,
    12
  );

export const Tank = () => {
  const fixtureGlow = useRef<THREE.MeshBasicMaterial>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const moonSpot = useRef<THREE.SpotLight>(null);
  const heaterGlow = useRef<THREE.MeshBasicMaterial>(null);

  const parts = useMemo(() => {
    const backdrop = makeUnderwater(
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#ffffff',
        emissiveMap: backdropTexture(),
        roughness: 1,
      }),
      { key: 'backdrop' }
    );
    const surface = new THREE.ShaderMaterial({
      uniforms: {
        uTime: waterUniforms.uTime,
        uTankLight: waterUniforms.uTankLight,
        uMoonLight: waterUniforms.uMoonLight,
        uWaterColor: waterUniforms.uWaterColor,
      },
      vertexShader: surfaceVertex,
      fragmentShader: surfaceFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const pipeGlass = makeUnderwater(
      new THREE.MeshPhysicalMaterial({
        color: '#cfe9e2',
        roughness: 0.08,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
      { key: 'pipe' }
    );
    const intake = pipe(
      [
        [0.5, 0.12, -D / 2 + 0.035],
        [0.5, H - 0.02, -D / 2 + 0.035],
        [0.5, H + 0.025, -D / 2 + 0.01],
        [0.5, H + 0.02, -D / 2 - 0.03],
        [0.5, H - 0.12, -D / 2 - 0.035],
      ],
      0.008
    );
    const outflow = pipe(
      [
        [-0.5, H - 0.12, -D / 2 - 0.035],
        [-0.5, H + 0.02, -D / 2 - 0.03],
        [-0.5, H + 0.025, -D / 2 + 0.01],
        [-0.5, WL - 0.02, -D / 2 + 0.035],
        [-0.5, WL - 0.04, -D / 2 + 0.07],
      ],
      0.008
    );
    return {
      backdrop,
      surface,
      glass: glassMaterial(),
      edge: edgeMaterial(),
      pipeGlass,
      intake,
      outflow,
    };
  }, []);
  useDispose(parts);

  useLayoutEffect(() => {
    // Spot targets are not in the scene graph, so their (world) matrices are set once by hand.
    for (const light of [spot.current!, moonSpot.current!]) {
      light.target.position.set(TANK_ORIGIN[0], TANK_ORIGIN[1] - 1, TANK_ORIGIN[2]);
      light.target.updateMatrixWorld();
    }
  }, []);

  useFrame(() => {
    const t = daylight.tankLight;
    const m = daylight.moonLight;
    fixtureGlow
      .current!.color.setRGB(0.9 * t + 0.08 * m, 0.95 * t + 0.16 * m, 1 * t + 0.6 * m)
      .multiplyScalar(4);
    spot.current!.intensity = t * 9;
    moonSpot.current!.intensity = m * 1.2;
    parts.backdrop.emissiveIntensity = 0.06 + t * 0.55 + m * 0.05;
    heaterGlow
      .current!.color.setRGB(1, 0.35, 0.1)
      .multiplyScalar(1.5 + Math.sin(performance.now() * 0.0004) * 0.5);
  });

  const onFeed = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 6) return; // a drag, not a click
    event.stopPropagation();
    const local = event.point.clone().sub(new THREE.Vector3(...TANK_ORIGIN));
    simulation.food.sprinkle(local.x, local.z);
  };

  return (
    <group position={TANK_ORIGIN as unknown as [number, number, number]}>
      {/* Frosted, backlit rear panel. */}
      <mesh position={[0, H / 2, -D / 2 + 0.003]} material={parts.backdrop}>
        <planeGeometry args={[W - 0.002, H]} />
      </mesh>

      {/* Water surface. */}
      <mesh position-y={WL} rotation-x={-Math.PI / 2} material={parts.surface} renderOrder={5}>
        <planeGeometry args={[W - 0.002, D - 0.002]} />
      </mesh>

      {/* Filter pipes and heater. */}
      <mesh geometry={parts.intake} material={parts.pipeGlass} renderOrder={6} />
      <mesh geometry={parts.outflow} material={parts.pipeGlass} renderOrder={6} />
      <mesh position={[0.5, 0.1, -D / 2 + 0.035]} material={parts.pipeGlass} renderOrder={6}>
        <cylinderGeometry args={[0.013, 0.013, 0.07, 16]} />
      </mesh>
      <group position={[-0.43, 0.2, -D / 2 + 0.03]} rotation-z={0.5}>
        <mesh material={parts.pipeGlass} renderOrder={6}>
          <cylinderGeometry args={[0.011, 0.011, 0.2, 14]} />
        </mesh>
        <mesh position-y={-0.08}>
          <cylinderGeometry args={[0.004, 0.004, 0.02, 8]} />
          <meshBasicMaterial ref={heaterGlow} toneMapped={false} />
        </mesh>
      </group>

      {/* Glass panes, drawn after everything inside. */}
      <group renderOrder={10}>
        <mesh position={[0, H / 2 - G / 2, D / 2 - G / 2]} material={parts.glass} renderOrder={10}>
          <boxGeometry args={[W, H + G, G]} />
        </mesh>
        <mesh position={[0, H / 2 - G / 2, -D / 2 + G / 2]} material={parts.glass} renderOrder={10}>
          <boxGeometry args={[W, H + G, G]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[(side * (W - G)) / 2, H / 2 - G / 2, 0]}
            material={parts.glass}
            renderOrder={10}
          >
            <boxGeometry args={[G, H + G, D - G * 2]} />
          </mesh>
        ))}
        <mesh position={[0, -G / 2, 0]} material={parts.glass} renderOrder={10}>
          <boxGeometry args={[W, G, D]} />
        </mesh>
        {/* Glass edges catch the light and read green, like real float glass. */}
        {[
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh
            key={i}
            position={[sx! * (W / 2 - 0.0015), H / 2 - G / 2, sz! * (D / 2 - 0.0015)]}
            material={parts.edge}
            renderOrder={11}
          >
            <boxGeometry args={[0.003, H + G, 0.003]} />
          </mesh>
        ))}
        {[-1, 1].map((sz) => (
          <mesh
            key={`top${sz}`}
            position={[0, H, sz * (D / 2 - G / 2)]}
            material={parts.edge}
            renderOrder={11}
          >
            <boxGeometry args={[W, 0.002, G]} />
          </mesh>
        ))}
        {[-1, 1].map((sx) => (
          <mesh
            key={`side${sx}`}
            position={[sx * (W / 2 - G / 2), H, 0]}
            material={parts.edge}
            renderOrder={11}
          >
            <boxGeometry args={[G, 0.002, D]} />
          </mesh>
        ))}
        {/* Meniscus: the waterline catches a thin bright line on the front glass. */}
        <mesh position={[0, WL, D / 2 - G - 0.0005]} renderOrder={11}>
          <planeGeometry args={[W - G * 2, 0.0025]} />
          <meshBasicMaterial color="#d9f1ee" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      </group>

      {/* Slim LED fixture on legs. */}
      <group position-y={FIXTURE_Y}>
        <mesh castShadow>
          <boxGeometry args={[W - 0.08, 0.014, 0.11]} />
          <meshStandardMaterial color="#141516" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position-y={-0.0075} rotation-x={Math.PI / 2}>
          <planeGeometry args={[W - 0.12, 0.08]} />
          <meshBasicMaterial ref={fixtureGlow} toneMapped={false} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`${sx}${sz}`}
              position={[sx * (W / 2 - 0.05), -0.065, sz * 0.05]}
              rotation-x={sz * 0.6}
            >
              <cylinderGeometry args={[0.003, 0.003, 0.15, 6]} />
              <meshStandardMaterial color="#141516" metalness={0.6} roughness={0.35} />
            </mesh>
          ))
        )}
        <spotLight
          ref={spot}
          position={[0, -0.01, 0]}
          angle={1.05}
          penumbra={0.9}
          distance={1.4}
          decay={1.6}
          color="#eef7ff"
        />
        <spotLight
          ref={moonSpot}
          position={[0, -0.01, 0]}
          angle={1.0}
          penumbra={1}
          distance={1.4}
          decay={1.6}
          color="#4a6dff"
        />
      </group>

      {/* Click target covering the water: clicking sprinkles food above that spot. */}
      <mesh
        position={[0, WL / 2, 0]}
        onClick={onFeed}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <boxGeometry args={[W, WL, D]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
};
