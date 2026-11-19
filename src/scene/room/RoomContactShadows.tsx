import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BACK_WALL_Z, LAMP, ROOM, TANK_ORIGIN } from '../../config/scene';
import { softShadowTexture } from '../textures';
import { useDispose } from '../dispose';
import { writeShadowMatrix } from '../shadows';

const shadows = [
  { x: 0, y: 0.006, z: TANK_ORIGIN[2], width: 1.58, depth: 0.72, rotation: 0 },
  { x: 0.1, y: 0.006, z: 1.45, width: 2.55, depth: 1.12, rotation: 0 },
  { x: 0.05, y: 0.007, z: 0.3, width: 1.18, depth: 0.7, rotation: 0 },
  { x: LAMP.x, y: 0.006, z: LAMP.z, width: 0.44, depth: 0.44, rotation: 0 },
  { x: -1.2, y: 0.006, z: BACK_WALL_Z + 0.42, width: 0.65, depth: 0.65, rotation: 0 },
  {
    x: ROOM.width / 2 - 0.17,
    y: 0.006,
    z: -0.6,
    width: 0.48,
    depth: 1.18,
    rotation: 0,
  },
] as const;

const matrix = new THREE.Matrix4();

/** A static AO-like batch beneath furniture; omitted in Lite by Experience. */
export const RoomContactShadows = () => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#241f1a',
        alphaMap: softShadowTexture(),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );
  useDispose(material);

  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    for (let i = 0; i < shadows.length; i++) {
      const shadow = shadows[i]!;
      writeShadowMatrix(
        matrix,
        shadow.x,
        shadow.y,
        shadow.z,
        shadow.width,
        shadow.depth,
        shadow.rotation
      );
      target.setMatrixAt(i, matrix);
    }
    target.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, material, shadows.length]}
      frustumCulled={false}
      renderOrder={1}
    >
      <planeGeometry />
    </instancedMesh>
  );
};
