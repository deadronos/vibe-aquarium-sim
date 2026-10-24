import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TANK_ORIGIN, substrateHeight } from '../../config/scene';
import { ANEMONE, PLANTS, ROCKS, scatter } from '../../sim/aquascape';
import type { PlantClump } from '../../sim/aquascape';
import { plantGrowth } from '../../sim/care';
import { createRandom } from '../../sim/random';
import { useAquarium } from '../../state/store';
import { barkTexture, sandTexture } from '../textures';
import {
  PLANT_GEOMETRY,
  buildAnemoneTentacle,
  buildDriftwood,
  buildRock,
  buildSubstrate,
} from './aquascapeGeometry';
import { makeUnderwater } from './underwater';
import { useDispose } from '../dispose';

const SWAY = /* glsl */ `
{
  vec3 swayBase = instanceMatrix[3].xyz;
  float swayH = position.y;
  float swayK = swayH * swayH * uSway;
  transformed.x += sin(uTime * 0.9 + swayBase.x * 9.0 + swayBase.z * 5.0 + swayH * 2.4) * swayK;
  transformed.z += (cos(uTime * 0.7 + swayBase.x * 6.0 + swayH * 2.0) * 0.6 + 0.4) * swayK;
}
`;

// The sway amount is a uniform, so every plant kind and the anemone share one program.
const plantMaterial = (sway: number) =>
  makeUnderwater(
    new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.65 }),
    {
      caustics: true,
      vertexHead: 'uniform float uSway;',
      vertexDeform: SWAY,
      uniforms: { uSway: { value: sway } },
    }
  );

const PlantClumpView = ({ clump, index }: { clump: PlantClump; index: number }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(() => scatter(clump, 500 + index), [clump, index]);
  const geometry = useMemo(() => PLANT_GEOMETRY[clump.kind](), [clump.kind]);
  useDispose(geometry);
  const material = useMemo(
    () => plantMaterial(clump.kind === 'ribbon' ? 0.09 : clump.kind === 'sword' ? 0.03 : 0.12),
    [clump.kind]
  );
  useDispose(material);
  // Plants fill out over real days; rounded so the minute-by-minute care clock rarely re-lays them.
  const growth = useAquarium(
    (state) => Math.round(plantGrowth(state.care, state.careNow) * 100) / 100
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
      const h = clump.height * p.s * growth;
      const widthScale = clump.kind === 'carpet' ? clump.height : 1;
      dummy.scale.set(widthScale, h, clump.kind === 'carpet' ? clump.height : h);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [points, clump, growth]);
  return (
    <instancedMesh ref={mesh} args={[geometry, material, points.length]} frustumCulled={false} />
  );
};

const TENTACLES = 110;

/** The clownfish's anemone: a squat column with a crown of swaying tentacles. */
const Anemone = () => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const assets = useMemo(
    () => ({
      tentacle: buildAnemoneTentacle(),
      column: new THREE.CylinderGeometry(0.034, 0.03, ANEMONE.height * 0.5, 14),
      tentacleMaterial: plantMaterial(0.18),
      columnMaterial: makeUnderwater(
        new THREE.MeshStandardMaterial({ color: '#c98a6a', roughness: 0.7 }),
        { caustics: true }
      ),
    }),
    []
  );
  useDispose(assets);
  useLayoutEffect(() => {
    const random = createRandom(77);
    const dummy = new THREE.Object3D();
    const top = ANEMONE.y + ANEMONE.height * 0.45;
    for (let i = 0; i < TENTACLES; i++) {
      // Sunflower spiral over the oral disc; outer tentacles lean further out.
      const t = Math.sqrt((i + 0.5) / TENTACLES);
      const angle = i * 2.39996;
      const r = t * 0.034;
      dummy.position.set(ANEMONE.x + Math.cos(angle) * r, top, ANEMONE.z + Math.sin(angle) * r);
      dummy.rotation.set(0, -angle, 0);
      dummy.rotateZ(-(0.15 + t * 0.95) + random.range(-0.12, 0.12));
      dummy.scale.setScalar(ANEMONE.height * random.range(0.75, 1.05));
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    }
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <mesh
        geometry={assets.column}
        material={assets.columnMaterial}
        position={[ANEMONE.x, ANEMONE.y + ANEMONE.height * 0.2, ANEMONE.z]}
      />
      <instancedMesh
        ref={mesh}
        args={[assets.tentacle, assets.tentacleMaterial, TENTACLES]}
        frustumCulled={false}
      />
    </group>
  );
};

export const Aquascape = () => {
  const assets = useMemo(() => {
    const sand = makeUnderwater(
      new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1, color: '#e6d6bc' }),
      { caustics: true }
    );
    const stone = makeUnderwater(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }),
      { caustics: true }
    );
    const bark = barkTexture().clone();
    bark.repeat.set(2, 1);
    bark.needsUpdate = true;
    const wood = makeUnderwater(
      new THREE.MeshStandardMaterial({ map: bark, roughness: 0.9, color: '#b38f72' }),
      { caustics: true }
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
  useDispose(assets);

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
      <Anemone />
    </group>
  );
};
