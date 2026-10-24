import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BACK_WALL_Z } from '../../../config/scene';
import { createRandom } from '../../../sim/random';
import type { Materials } from './materials';
import { useDispose } from '../../dispose';

/** Fiddle-leaf fig in a ceramic pot. */
export const PottedPlant = ({ m }: { m: Materials }) => {
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
