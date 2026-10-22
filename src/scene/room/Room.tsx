import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE, ROOM, WINDOW } from '../../config/scene';
import { daylight } from '../daylight';
import { fabricTexture, plasterTexture, treelineTexture, woodFloorTexture } from '../textures';

const WALL = 0.14;
const HALF_W = ROOM.width / 2;
const HALF_D = ROOM.depth / 2;

const skyUniforms = {
  uTop: { value: daylight.skyTop },
  uHorizon: { value: daylight.skyHorizon },
};

const TREE_TINT = new THREE.Color(0.55, 0.75, 0.5);

const repeated = (texture: THREE.Texture, x: number, y: number) => {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  copy.needsUpdate = true;
  return copy;
};

/** A wall slab with optional rectangular openings, built from boxes so it casts proper shadows. */
const Slab = ({
  size,
  position,
  material,
}: {
  size: [number, number, number];
  position: [number, number, number];
  material: THREE.Material;
}) => (
  <mesh position={position} material={material} castShadow receiveShadow>
    <boxGeometry args={size} />
  </mesh>
);

const Curtain = ({ z }: { z: number }) => {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.55, 2.35, 48, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(x * 38) * 0.022 + Math.sin(x * 13 + 1) * 0.01);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e9e1d3',
        map: repeated(fabricTexture(), 3, 12),
        roughness: 0.95,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.93,
      }),
    []
  );
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[-HALF_W + 0.13, 1.2, z]}
      rotation-y={Math.PI / 2}
      castShadow
      receiveShadow
    />
  );
};

export const Room = () => {
  const materials = useMemo(() => {
    const plaster = plasterTexture();
    const floorMap = repeated(woodFloorTexture(), ROOM.width / 2, ROOM.depth / 2);
    return {
      floor: new THREE.MeshStandardMaterial({
        map: floorMap,
        roughness: 0.55,
        metalness: 0,
        color: '#d2b8a0',
      }),
      wall: new THREE.MeshStandardMaterial({
        map: repeated(plaster, 3, 2),
        color: PALETTE.wall,
        roughness: 0.95,
      }),
      accent: new THREE.MeshStandardMaterial({
        map: repeated(plaster, 3, 2),
        color: PALETTE.wallAccent,
        roughness: 0.95,
      }),
      ceiling: new THREE.MeshStandardMaterial({ color: PALETTE.ceiling, roughness: 1 }),
      trim: new THREE.MeshStandardMaterial({ color: PALETTE.trim, roughness: 0.6 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.02,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      }),
      sky: new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          varying vec2 vUv;
          void main() {
            gl_FragColor = vec4(mix(uHorizon, uTop, smoothstep(0.15, 0.95, vUv.y)) * 1.25, 1.0);
            #include <colorspace_fragment>
          }
        `,
        depthWrite: false,
      }),
      trees: new THREE.MeshBasicMaterial({
        alphaMap: treelineTexture(),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, []);

  useFrame(() => {
    materials.trees.color
      .copy(daylight.skyHorizon)
      .lerp(daylight.skyTop, 0.5)
      .multiply(TREE_TINT)
      .multiplyScalar(0.8);
  });

  const winBottom = WINDOW.centerY - WINDOW.height / 2;
  const winTop = WINDOW.centerY + WINDOW.height / 2;
  const winFront = WINDOW.centerZ + WINDOW.width / 2;
  const winBack = WINDOW.centerZ - WINDOW.width / 2;
  const lx = -HALF_W - WALL / 2;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={materials.floor} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
      </mesh>
      <mesh
        rotation-x={Math.PI / 2}
        position-y={ROOM.height}
        material={materials.ceiling}
        receiveShadow
      >
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
      </mesh>

      {/* Back wall (accent colour behind the tank), right wall, front wall. */}
      <Slab
        size={[ROOM.width + WALL * 2, ROOM.height, WALL]}
        position={[0, ROOM.height / 2, -HALF_D - WALL / 2]}
        material={materials.accent}
      />
      <Slab
        size={[WALL, ROOM.height, ROOM.depth]}
        position={[HALF_W + WALL / 2, ROOM.height / 2, 0]}
        material={materials.wall}
      />
      <Slab
        size={[ROOM.width + WALL * 2, ROOM.height, WALL]}
        position={[0, ROOM.height / 2, HALF_D + WALL / 2]}
        material={materials.wall}
      />

      {/* Left wall, built around the window opening. */}
      <Slab
        size={[WALL, ROOM.height, HALF_D + winBack]}
        position={[lx, ROOM.height / 2, (-HALF_D + winBack) / 2]}
        material={materials.wall}
      />
      <Slab
        size={[WALL, ROOM.height, HALF_D - winFront]}
        position={[lx, ROOM.height / 2, (HALF_D + winFront) / 2]}
        material={materials.wall}
      />
      <Slab
        size={[WALL, winBottom, WINDOW.width]}
        position={[lx, winBottom / 2, WINDOW.centerZ]}
        material={materials.wall}
      />
      <Slab
        size={[WALL, ROOM.height - winTop, WINDOW.width]}
        position={[lx, (ROOM.height + winTop) / 2, WINDOW.centerZ]}
        material={materials.wall}
      />

      {/* Window frame, mullions, sill and glass. */}
      <group position={[lx, WINDOW.centerY, WINDOW.centerZ]}>
        {[
          { s: [WALL + 0.02, 0.06, WINDOW.width + 0.06], p: [0, WINDOW.height / 2, 0] },
          { s: [WALL + 0.02, 0.06, WINDOW.width + 0.06], p: [0, -WINDOW.height / 2, 0] },
          { s: [WALL + 0.02, WINDOW.height, 0.06], p: [0, 0, WINDOW.width / 2] },
          { s: [WALL + 0.02, WINDOW.height, 0.06], p: [0, 0, -WINDOW.width / 2] },
          { s: [0.05, WINDOW.height, 0.04], p: [0, 0, 0] },
          { s: [0.05, 0.04, WINDOW.width], p: [0, 0.18, 0] },
          { s: [0.22, 0.035, WINDOW.width + 0.16], p: [0.08, -WINDOW.height / 2 - 0.03, 0] },
        ].map(({ s, p }, i) => (
          <mesh
            key={i}
            position={p as [number, number, number]}
            material={materials.trim}
            castShadow
            receiveShadow
          >
            <boxGeometry args={s as [number, number, number]} />
          </mesh>
        ))}
        <mesh rotation-y={Math.PI / 2} material={materials.glass}>
          <planeGeometry args={[WINDOW.width, WINDOW.height]} />
        </mesh>
      </group>

      {/* Outside: gradient sky and a soft tree line. */}
      <mesh
        position={[-HALF_W - 6, 2, WINDOW.centerZ]}
        rotation-y={Math.PI / 2}
        material={materials.sky}
      >
        <planeGeometry args={[30, 16]} />
      </mesh>
      <mesh
        position={[-HALF_W - 4, 0.35, WINDOW.centerZ]}
        rotation-y={Math.PI / 2}
        material={materials.trees}
      >
        <planeGeometry args={[14, 6]} />
      </mesh>

      <Curtain z={winFront + 0.3} />
      <Curtain z={winBack - 0.3} />
      <mesh position={[-HALF_W + 0.1, winTop + 0.16, WINDOW.centerZ]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, WINDOW.width + 1.4, 12]} />
        <meshStandardMaterial color={PALETTE.brass} metalness={0.8} roughness={0.35} />
      </mesh>

      {/* Baseboards. */}
      {[
        { s: [ROOM.width, 0.1, 0.02], p: [0, 0.05, -HALF_D + 0.01] },
        { s: [ROOM.width, 0.1, 0.02], p: [0, 0.05, HALF_D - 0.01] },
        { s: [0.02, 0.1, ROOM.depth], p: [-HALF_W + 0.01, 0.05, 0] },
        { s: [0.02, 0.1, ROOM.depth], p: [HALF_W - 0.01, 0.05, 0] },
      ].map(({ s, p }, i) => (
        <mesh
          key={i}
          position={p as [number, number, number]}
          material={materials.trim}
          receiveShadow
        >
          <boxGeometry args={s as [number, number, number]} />
        </mesh>
      ))}
    </group>
  );
};
