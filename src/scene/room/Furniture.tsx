import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BACK_WALL_Z, CABINET, LAMP, PALETTE, ROOM, TANK, TANK_ORIGIN } from '../../config/scene';
import { createRandom } from '../../sim/random';
import { daylight } from '../daylight';
import { artTexture, fabricTexture, rugTexture, woodGrainTexture } from '../textures';
import { useDispose } from '../dispose';

const tex = (texture: THREE.Texture, x: number, y: number, rotate = false) => {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  if (rotate) {
    copy.center.set(0.5, 0.5);
    copy.rotation = Math.PI / 2;
  }
  copy.needsUpdate = true;
  return copy;
};

const useMaterials = () =>
  useMemo(
    () => ({
      walnut: new THREE.MeshStandardMaterial({
        map: tex(woodGrainTexture(), 1.2, 1),
        color: '#9c7a62',
        roughness: 0.5,
      }),
      walnutTop: new THREE.MeshStandardMaterial({
        map: tex(woodGrainTexture(), 1.4, 0.8),
        color: '#a88569',
        roughness: 0.35,
      }),
      oak: new THREE.MeshStandardMaterial({
        map: tex(woodGrainTexture(), 1, 1),
        color: '#f0d8bd',
        roughness: 0.5,
      }),
      sofa: new THREE.MeshStandardMaterial({
        map: tex(fabricTexture(), 8, 8),
        color: PALETTE.sofa,
        roughness: 0.92,
      }),
      cushion: new THREE.MeshStandardMaterial({
        map: tex(fabricTexture(), 6, 6),
        color: '#7d8f95',
        roughness: 0.92,
      }),
      throwPillow: new THREE.MeshStandardMaterial({
        map: tex(fabricTexture(), 4, 4),
        color: '#c98a5e',
        roughness: 0.9,
      }),
      brass: new THREE.MeshStandardMaterial({
        color: PALETTE.brass,
        metalness: 0.85,
        roughness: 0.32,
      }),
      black: new THREE.MeshStandardMaterial({
        color: PALETTE.blackMetal,
        metalness: 0.4,
        roughness: 0.45,
      }),
      ceramic: new THREE.MeshStandardMaterial({ color: PALETTE.pot, roughness: 0.55 }),
      soil: new THREE.MeshStandardMaterial({ color: '#3a2b20', roughness: 1 }),
      shade: new THREE.MeshStandardMaterial({
        map: tex(fabricTexture(), 6, 3),
        color: '#efe3cf',
        roughness: 0.95,
        side: THREE.DoubleSide,
        emissive: new THREE.Color('#ffb661'),
        emissiveIntensity: 0,
      }),
      foam: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }),
    }),
    []
  );

type Materials = ReturnType<typeof useMaterials>;

/** Mid-century sideboard the tank sits on. */
const Cabinet = ({ m }: { m: Materials }) => {
  const legH = 0.14;
  const bodyH = CABINET.height - legH;
  const z = TANK_ORIGIN[2];
  const front = CABINET.depth / 2;
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, legH + bodyH / 2, 0]} material={m.walnut} castShadow receiveShadow>
        <boxGeometry args={[CABINET.width, bodyH - 0.03, CABINET.depth]} />
      </mesh>
      <mesh
        position={[0, CABINET.height - 0.015, 0]}
        material={m.walnutTop}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CABINET.width + 0.02, 0.03, CABINET.depth + 0.02]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Door panels with a shadow gap and a slim brass pull. */}
          <mesh
            position={[side * CABINET.width * 0.25, legH + bodyH / 2 - 0.01, front + 0.006]}
            material={m.walnut}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[CABINET.width / 2 - 0.02, bodyH - 0.07, 0.012]} />
          </mesh>
          <mesh position={[side * 0.05, legH + bodyH * 0.62, front + 0.022]} material={m.brass}>
            <boxGeometry args={[0.012, 0.16, 0.012]} />
          </mesh>
        </group>
      ))}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx! * (CABINET.width / 2 - 0.08), legH / 2, sz! * (CABINET.depth / 2 - 0.07)]}
          rotation={[sz! * 0.08, 0, -sx! * 0.08]}
          material={m.walnut}
          castShadow
        >
          <cylinderGeometry args={[0.018, 0.011, legH, 10]} />
        </mesh>
      ))}
      {/* Leveling mat under the tank. */}
      <mesh position={[0, CABINET.height + 0.006, 0]} material={m.foam}>
        <boxGeometry args={[TANK.width + 0.01, 0.012, TANK.depth + 0.01]} />
      </mesh>
      {/* Fish food tin. */}
      <group position={[CABINET.width / 2 - 0.05, CABINET.height + 0.045, 0.14]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.09, 20]} />
          <meshStandardMaterial color="#d8603b" roughness={0.5} />
        </mesh>
        <mesh position-y={0.05} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.012, 20]} />
          <meshStandardMaterial color="#f1e7d6" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
};

/** Three-seat sofa facing the tank. */
const Sofa = ({ m }: { m: Materials }) => {
  const width = 2.2;
  const depth = 0.92;
  return (
    <group position={[0.1, 0, 1.45]}>
      <RoundedBox
        args={[width, 0.34, depth]}
        radius={0.04}
        position={[0, 0.3, 0]}
        material={m.sofa}
        castShadow
        receiveShadow
      />
      {[-1, 0, 1].map((i) => (
        <group key={i}>
          <RoundedBox
            args={[0.62, 0.16, 0.66]}
            radius={0.06}
            smoothness={4}
            position={[i * 0.64, 0.54, -0.08]}
            material={m.cushion}
            castShadow
            receiveShadow
          />
          <RoundedBox
            args={[0.62, 0.48, 0.2]}
            radius={0.08}
            smoothness={4}
            position={[i * 0.64, 0.78, 0.3]}
            rotation-x={-0.16}
            material={m.cushion}
            castShadow
            receiveShadow
          />
        </group>
      ))}
      <RoundedBox
        args={[width, 0.6, 0.16]}
        radius={0.05}
        position={[0, 0.66, 0.4]}
        material={m.sofa}
        castShadow
        receiveShadow
      />
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.17, 0.62, depth]}
          radius={0.06}
          smoothness={4}
          position={[side * (width / 2 - 0.085), 0.47, 0]}
          material={m.sofa}
          castShadow
          receiveShadow
        />
      ))}
      <RoundedBox
        args={[0.42, 0.38, 0.13]}
        radius={0.06}
        smoothness={4}
        position={[-0.72, 0.78, 0.13]}
        rotation={[-0.25, 0.3, 0.12]}
        material={m.throwPillow}
        castShadow
      />
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx! * (width / 2 - 0.1), 0.065, sz! * (depth / 2 - 0.1)]}
          material={m.walnut}
          castShadow
        >
          <cylinderGeometry args={[0.02, 0.014, 0.13, 8]} />
        </mesh>
      ))}
    </group>
  );
};

const CoffeeTable = ({ m }: { m: Materials }) => (
  <group position={[0.05, 0, 0.3]}>
    <mesh position-y={0.4} scale={[1, 1, 0.58]} material={m.oak} castShadow receiveShadow>
      <cylinderGeometry args={[0.52, 0.52, 0.032, 48]} />
    </mesh>
    {[0.6, 2.2, 3.8, 5.4].map((a, i) => (
      <mesh
        key={i}
        position={[Math.cos(a) * 0.36, 0.2, Math.sin(a) * 0.19]}
        rotation={[Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]}
        material={m.oak}
        castShadow
      >
        <cylinderGeometry args={[0.017, 0.011, 0.4, 8]} />
      </mesh>
    ))}
    {/* A stack of books and a mug. */}
    {[
      ['#2f4858', 0.24, 0.035, 0.17, 0.1],
      ['#c4a35a', 0.22, 0.03, 0.16, -0.08],
      ['#8c3b2f', 0.2, 0.028, 0.15, 0.2],
    ].map(([color, w, h, d, rot], i) => (
      <mesh
        key={i}
        position={[-0.18, 0.432 + i * 0.032, 0.02]}
        rotation-y={rot as number}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w as number, h as number, d as number]} />
        <meshStandardMaterial color={color as string} roughness={0.75} />
      </mesh>
    ))}
    <mesh position={[0.2, 0.46, 0.06]} castShadow>
      <cylinderGeometry args={[0.04, 0.036, 0.09, 24, 1, true]} />
      <meshStandardMaterial color="#eae4da" roughness={0.3} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

const Rug = () => {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }),
    []
  );
  useDispose(material);
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0.05, 0.004, 0.55]}
      material={material}
      receiveShadow
    >
      <planeGeometry args={[2.9, 2]} />
    </mesh>
  );
};

const FloorLamp = ({ m }: { m: Materials }) => {
  useFrame(() => {
    m.shade.emissiveIntensity = daylight.lamp * 1.6;
  });
  return (
    <group position={[LAMP.x, 0, LAMP.z]}>
      <mesh position-y={0.012} material={m.black} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.16, 0.024, 32]} />
      </mesh>
      <mesh position-y={0.76} material={m.brass} castShadow>
        <cylinderGeometry args={[0.009, 0.009, 1.5, 10]} />
      </mesh>
      <mesh position-y={LAMP.shadeY} material={m.shade} castShadow>
        <cylinderGeometry args={[0.17, 0.21, 0.28, 40, 1, true]} />
      </mesh>
    </group>
  );
};

/** Fiddle-leaf fig in a ceramic pot. */
const PottedPlant = ({ m }: { m: Materials }) => {
  const leaves = useRef<THREE.InstancedMesh>(null);
  const LEAF_COUNT = 44;
  const leafGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.09, 0.05, 0.1, 0.22, 0, 0.3);
    shape.bezierCurveTo(-0.1, 0.22, -0.09, 0.05, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 8);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, -Math.abs(x) * 0.5 + y * y * 0.6);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  useDispose(leafGeometry);
  const potGeometry = useMemo(() => {
    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.15, 0),
      new THREE.Vector2(0.19, 0.08),
      new THREE.Vector2(0.2, 0.34),
      new THREE.Vector2(0.21, 0.36),
      new THREE.Vector2(0.19, 0.36),
      new THREE.Vector2(0.18, 0.32),
    ];
    return new THREE.LatheGeometry(profile, 40);
  }, []);
  useDispose(potGeometry);

  useLayoutEffect(() => {
    const random = createRandom(42);
    const dummy = new THREE.Object3D();
    const UP = new THREE.Vector3(0, 1, 0);
    const outward = new THREE.Vector3();
    const twist = new THREE.Quaternion();
    for (let i = 0; i < LEAF_COUNT; i++) {
      const t = i / LEAF_COUNT;
      const angle = i * 2.39996;
      const height = 0.75 + t * 0.85 + random.range(-0.05, 0.05);
      const radius = 0.08 + Math.sin(t * Math.PI) * 0.22 + random.range(0, 0.05);
      dummy.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      // Leaf +Y points outwards and a little up; then twist it so the blade faces the sky.
      const tilt = random.range(-0.15, 0.55) + t * 0.3;
      outward.set(
        Math.cos(angle) * Math.cos(tilt),
        Math.sin(tilt),
        Math.sin(angle) * Math.cos(tilt)
      );
      dummy.quaternion.setFromUnitVectors(UP, outward);
      twist.setFromAxisAngle(outward, Math.PI / 2 + random.range(-0.4, 0.4));
      dummy.quaternion.premultiply(twist);
      dummy.scale.setScalar(random.range(0.75, 1.15));
      dummy.updateMatrix();
      leaves.current!.setMatrixAt(i, dummy.matrix);
      leaves.current!.setColorAt(
        i,
        new THREE.Color().setHSL(0.28 + random.range(-0.02, 0.03), 0.45, random.range(0.2, 0.32))
      );
    }
    leaves.current!.instanceMatrix.needsUpdate = true;
    leaves.current!.instanceColor!.needsUpdate = true;
  }, []);

  return (
    <group position={[-1.2, 0, BACK_WALL_Z + 0.42]}>
      <mesh geometry={potGeometry} material={m.ceramic} castShadow receiveShadow />
      <mesh position-y={0.33} material={m.soil}>
        <cylinderGeometry args={[0.185, 0.185, 0.01, 24]} />
      </mesh>
      <mesh position-y={0.9} rotation-z={0.04} castShadow>
        <cylinderGeometry args={[0.014, 0.022, 1.2, 8]} />
        <meshStandardMaterial color="#5b4a3a" roughness={0.9} />
      </mesh>
      <instancedMesh
        ref={leaves}
        args={[leafGeometry, undefined, LEAF_COUNT]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.55} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
};

/** Bookshelf against the right wall. */
const Bookshelf = ({ m }: { m: Materials }) => {
  const books = useRef<THREE.InstancedMesh>(null);
  const width = 1.0;
  const height = 1.95;
  const depth = 0.32;
  const shelves = 5;
  const layout = useMemo(() => {
    const random = createRandom(9);
    const palette = [
      '#2f4858',
      '#8c3b2f',
      '#c4a35a',
      '#4f6a63',
      '#d9cbb2',
      '#6d5a7a',
      '#a8573c',
      '#2b2b2b',
      '#e0d6c2',
    ];
    const items: {
      x: number;
      y: number;
      w: number;
      h: number;
      d: number;
      lean: number;
      color: string;
    }[] = [];
    for (let s = 0; s < shelves - 1; s++) {
      let x = -width / 2 + 0.04 + random.range(0, 0.15);
      const shelfY = 0.06 + (s * (height - 0.08)) / (shelves - 1) + 0.02;
      const limit = width / 2 - 0.04 - random.range(0, 0.25);
      while (x < limit) {
        const w = random.range(0.02, 0.045);
        const h = random.range(0.2, 0.3);
        const lean = random.next() > 0.92 ? 0.25 : 0;
        items.push({
          x: x + w / 2,
          y: shelfY,
          w,
          h,
          d: random.range(0.15, 0.22),
          lean,
          color: random.pick(palette),
        });
        x += w + (lean ? 0.06 : 0.002);
      }
    }
    return items;
  }, []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    layout.forEach((b, i) => {
      dummy.position.set(b.x, b.y + b.h / 2, 0);
      dummy.rotation.set(0, 0, -b.lean);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      books.current!.setMatrixAt(i, dummy.matrix);
      books.current!.setColorAt(i, color.set(b.color));
    });
    books.current!.instanceMatrix.needsUpdate = true;
    books.current!.instanceColor!.needsUpdate = true;
  }, [layout]);

  return (
    <group position={[ROOM.width / 2 - depth / 2 - 0.01, 0, -0.6]} rotation-y={-Math.PI / 2}>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[(side * width) / 2, height / 2, 0]}
          material={m.oak}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.025, height, depth]} />
        </mesh>
      ))}
      {Array.from({ length: shelves }, (_, s) => (
        <mesh
          key={s}
          position={[0, 0.05 + (s * (height - 0.08)) / (shelves - 1), 0]}
          material={m.oak}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, 0.022, depth]} />
        </mesh>
      ))}
      <instancedMesh
        ref={books}
        args={[undefined, undefined, layout.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <mesh position={[0.33, height - 0.32, 0]} castShadow>
        <sphereGeometry args={[0.07, 24, 16]} />
        <meshStandardMaterial color="#5c7d74" roughness={0.3} />
      </mesh>
    </group>
  );
};

const WallArt = () => {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: artTexture(), roughness: 0.85 }),
    []
  );
  useDispose(material);
  const centerY = TANK_ORIGIN[1] + TANK.height + 0.68;
  return (
    <group position={[0, centerY, BACK_WALL_Z + 0.02]}>
      <mesh castShadow>
        <boxGeometry args={[0.66, 0.8, 0.025]} />
        <meshStandardMaterial color="#1c1a18" roughness={0.6} />
      </mesh>
      <mesh position-z={0.0135} material={material}>
        <planeGeometry args={[0.6, 0.74]} />
      </mesh>
    </group>
  );
};

export const Furniture = () => {
  const m = useMaterials();
  useDispose(m);
  return (
    <>
      <Cabinet m={m} />
      <Sofa m={m} />
      <CoffeeTable m={m} />
      <Rug />
      <FloorLamp m={m} />
      <PottedPlant m={m} />
      <Bookshelf m={m} />
      <WallArt />
    </>
  );
};
