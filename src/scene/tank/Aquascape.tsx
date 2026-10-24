import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TANK_ORIGIN, substrateHeight } from '../../config/scene';
import { PLANTS, ROCKS, scatter } from '../../sim/aquascape';
import type { PlantClump } from '../../sim/aquascape';
import { barkTexture, sandTexture } from '../textures';
import { PLANT_GEOMETRY, buildDriftwood, buildRock, buildSubstrate } from './aquascapeGeometry';
import { makeUnderwater } from './underwater';

const SWAY = /* glsl */ `
{
  vec3 swayBase = instanceMatrix[3].xyz;
  float swayH = position.y;
  float swayK = swayH * swayH * SWAY_AMOUNT;
  transformed.x += sin(uTime * 0.9 + swayBase.x * 9.0 + swayBase.z * 5.0 + swayH * 2.4) * swayK;
  transformed.z += (cos(uTime * 0.7 + swayBase.x * 6.0 + swayH * 2.0) * 0.6 + 0.4) * swayK;
}
`;

const plantMaterial = (key: string, sway: number) =>
  makeUnderwater(
    new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.65 }),
    {
      key: `plant-${key}`,
      caustics: true,
      vertexDeform: SWAY.replace('SWAY_AMOUNT', sway.toFixed(3)),
    }
  );

const PlantClumpView = ({ clump, index }: { clump: PlantClump; index: number }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(() => scatter(clump, 500 + index), [clump, index]);
  const geometry = useMemo(() => PLANT_GEOMETRY[clump.kind](), [clump.kind]);
  const material = useMemo(
    () =>
      plantMaterial(
        clump.kind,
        clump.kind === 'ribbon' ? 0.09 : clump.kind === 'sword' ? 0.03 : 0.12
      ),
    [clump.kind]
  );
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    points.forEach((p, i) => {
      dummy.position.set(p.x, substrateHeight(p.x, p.z) - 0.004, p.z);
      dummy.rotation.set(
        0,
        clump.kind === 'sword' ? (i / points.length) * Math.PI * 2 + p.r * 0.2 : p.r,
        0
      );
      if (clump.kind === 'ribbon') dummy.rotateX((p.r - Math.PI) * 0.04);
      const h = clump.height * p.s;
      const widthScale = clump.kind === 'carpet' ? clump.height : 1;
      dummy.scale.set(widthScale, h, clump.kind === 'carpet' ? clump.height : h);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [points, clump]);
  return (
    <instancedMesh ref={mesh} args={[geometry, material, points.length]} frustumCulled={false} />
  );
};

export const Aquascape = () => {
  const assets = useMemo(() => {
    const sand = makeUnderwater(
      new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1, color: '#e6d6bc' }),
      {
        key: 'sand',
        caustics: true,
      }
    );
    const stone = makeUnderwater(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }),
      { key: 'stone', caustics: true }
    );
    const bark = barkTexture().clone();
    bark.repeat.set(2, 1);
    bark.needsUpdate = true;
    const wood = makeUnderwater(
      new THREE.MeshStandardMaterial({ map: bark, roughness: 0.9, color: '#b38f72' }),
      { key: 'wood', caustics: true }
    );
    return {
      substrate: buildSubstrate(),
      rocks: ROCKS.map((r) => buildRock(r.seed)),
      wood: buildDriftwood(),
      sand,
      stone,
      woodMaterial: wood,
    };
  }, []);

  return (
    <group position={TANK_ORIGIN}>
      <mesh geometry={assets.substrate} material={assets.sand} />
      {ROCKS.map((r, i) => (
        <mesh
          key={i}
          geometry={assets.rocks[i]}
          material={assets.stone}
          position={[r.x, r.y, r.z]}
          rotation-y={r.yaw}
          scale={[r.radius * 1.2, r.radius * r.squash, r.radius]}
        />
      ))}
      {assets.wood.map((geo, i) => (
        <mesh key={i} geometry={geo} material={assets.woodMaterial} />
      ))}
      {PLANTS.map((clump, i) => (
        <PlantClumpView key={i} clump={clump} index={i} />
      ))}
    </group>
  );
};
