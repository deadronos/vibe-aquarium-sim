import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ROOM } from '../../../config/scene';
import { createRandom } from '../../../sim/random';
import type { Materials } from './materials';

/** Bookshelf against the right wall. */
export const Bookshelf = ({ m }: { m: Materials }) => {
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
