import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TANK_ORIGIN } from '../../config/scene';
import { fishGrowth } from '../../sim/care';
import { FOOD_CAPACITY } from '../../sim/food';
import { hungerSlump } from '../../sim/school';
import { SPECIES } from '../../sim/species';
import { useAquarium } from '../../state/store';
import { makeUnderwater } from '../tank/underwater';
import { FISH_URLS } from './assets';
import { simulation } from './simulation';
import { useDispose } from '../dispose';

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const quaternion = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const tint = new THREE.Color();
const FED = new THREE.Color(1, 1, 1);
/** A hungry fish looks a little duller and greyer. */
const HUNGRY = new THREE.Color(0.8, 0.82, 0.86);
/**
 * Instanced raycasting tests this sphere before any fish; three caches it from the first frame's
 * instance positions, so give it one that covers the whole tank instead.
 */
const TANK_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 0.25, 0), 0.8);

/**
 * The source models are quantised, normal-less meshes with a node transform. Bake that into plain
 * float geometry, unit length along +Z (head forward), centred, with smooth normals.
 */
const prepareGeometry = (scene: THREE.Object3D) => {
  let source: THREE.Mesh | null = null;
  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!source && (child as THREE.Mesh).isMesh) source = child as THREE.Mesh;
  });
  const mesh = source! as THREE.Mesh;
  const srcPos = mesh.geometry.attributes.position!;
  const srcUv = mesh.geometry.attributes.uv!;
  const positions = new Float32Array(srcPos.count * 3);
  const uvs = new Float32Array(srcUv.count * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < srcPos.count; i++) {
    v.fromBufferAttribute(srcPos, i).applyMatrix4(mesh.matrixWorld);
    positions.set([v.x, v.y, v.z], i * 3);
    uvs.set([srcUv.getX(i), srcUv.getY(i)], i * 2);
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (mesh.geometry.index) geo.setIndex(mesh.geometry.index.clone());
  geo = mergeVertices(geo, 1e-5);
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  const length = box.max.z - box.min.z;
  geo.translate(-center.x, -center.y, -center.z);
  geo.scale(1 / length, 1 / length, 1 / length);
  geo.computeVertexNormals();
  return { geometry: geo, map: (mesh.material as THREE.MeshStandardMaterial).map };
};

const SWIM_HEAD = /* glsl */ `attribute vec2 aSwim;`;
const SWIM_DEFORM = /* glsl */ `
{
  float tail = clamp(0.55 - transformed.z, 0.0, 1.1);
  transformed.x += sin(aSwim.x - transformed.z * 6.0) * aSwim.y * tail * tail;
}
`;

interface SpeciesMesh {
  mesh: THREE.InstancedMesh;
  swim: THREE.InstancedBufferAttribute;
}

/** Draws the shared simulation's fish and food flakes; `SimulationDriver` advances it. */
export const FishView = () => {
  const gltfs = useGLTF(FISH_URLS);
  const meshes = useRef<(SpeciesMesh | null)[]>([]);
  const { school, food } = simulation;

  const assets = useMemo(
    () =>
      SPECIES.map((species) => {
        const { geometry, map } = prepareGeometry(gltfs[species.model]!.scene);
        const swim = new THREE.InstancedBufferAttribute(new Float32Array(species.count * 2), 2);
        swim.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute('aSwim', swim);
        const material = makeUnderwater(
          new THREE.MeshStandardMaterial({ map, roughness: 0.42, metalness: 0 }),
          {
            caustics: true,
            vertexHead: SWIM_HEAD,
            vertexDeform: SWIM_DEFORM,
          }
        );
        return { geometry, material, swim };
      }),
    [gltfs]
  );
  useDispose(assets);

  const foodMaterial = useMemo(
    () =>
      makeUnderwater(
        new THREE.MeshStandardMaterial({
          color: '#c46a2c',
          roughness: 0.8,
          side: THREE.DoubleSide,
        })
      ),
    []
  );
  useDispose(foodMaterial);
  const foodMesh = useRef<THREE.InstancedMesh>(null);
  // Fish names show on hover only in Follow mode, so the fish are not raycast the rest of the time.
  const following = useAquarium((state) => state.viewpoint === 'follow');
  const offsets = useMemo(
    () => SPECIES.map((_, s) => SPECIES.slice(0, s).reduce((n, sp) => n + sp.count, 0)),
    []
  );
  const hover = (s: number) => (event: ThreeEvent<PointerEvent>) => {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    const index = offsets[s]! + event.instanceId;
    if (useAquarium.getState().hoveredFish !== index) useAquarium.getState().setHoveredFish(index);
  };
  const unhover = () => useAquarium.getState().setHoveredFish(null);

  useFrame(() => {
    const { care, careNow } = useAquarium.getState();
    const growth = fishGrowth(care, careNow);
    // Fish instances: species are contiguous in the school, so a running offset maps them.
    let offset = 0;
    for (let s = 0; s < SPECIES.length; s++) {
      const entry = meshes.current[s];
      const count = SPECIES[s]!.count;
      if (entry) {
        const swim = entry.swim.array as Float32Array;
        for (let k = 0; k < count; k++) {
          const i = offset + k;
          position.set(school.pos[i * 3]!, school.pos[i * 3 + 1]!, school.pos[i * 3 + 2]!);
          euler.set(school.pitch[i]!, school.yaw[i]!, school.roll[i]!);
          quaternion.setFromEuler(euler);
          scale.setScalar(school.scale[i]! * growth);
          matrix.compose(position, quaternion, scale);
          entry.mesh.setMatrixAt(k, matrix);
          entry.mesh.setColorAt(k, tint.lerpColors(FED, HUNGRY, hungerSlump(school.hunger[i]!)));
          swim[k * 2] = school.phase[i]!;
          swim[k * 2 + 1] = 0.07 + school.effort[i]! * 0.09;
        }
        entry.mesh.instanceMatrix.needsUpdate = true;
        entry.mesh.instanceColor!.needsUpdate = true;
        entry.swim.needsUpdate = true;
      }
      offset += count;
    }

    const flakes = foodMesh.current;
    if (flakes) {
      for (let f = 0; f < FOOD_CAPACITY; f++) {
        if (food.active[f]) {
          position.set(food.pos[f * 3]!, food.pos[f * 3 + 1]!, food.pos[f * 3 + 2]!);
          const spin = food.seed[f]! + food.age[f]! * 1.5;
          euler.set(Math.PI / 2 + Math.sin(spin) * 0.6, spin, 0);
          quaternion.setFromEuler(euler);
          scale.setScalar(1);
        } else {
          scale.setScalar(0);
        }
        matrix.compose(position, quaternion, scale);
        flakes.setMatrixAt(f, matrix);
      }
      flakes.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={TANK_ORIGIN}>
      {assets.map((asset, s) => (
        <instancedMesh
          key={s}
          ref={(mesh) => {
            if (mesh) {
              mesh.boundingSphere = TANK_SPHERE;
              // Create the colour buffer up front so the first frame's tint is not a recompile.
              if (!mesh.instanceColor) mesh.setColorAt(0, FED);
            }
            meshes.current[s] = mesh ? { mesh, swim: asset.swim } : null;
          }}
          args={[asset.geometry, asset.material, SPECIES[s]!.count]}
          frustumCulled={false}
          onPointerMove={following ? hover(s) : undefined}
          onPointerOut={following ? unhover : undefined}
        />
      ))}
      <instancedMesh
        ref={foodMesh}
        args={[undefined, foodMaterial, FOOD_CAPACITY]}
        frustumCulled={false}
      >
        <circleGeometry args={[0.0032, 6]} />
      </instancedMesh>
    </group>
  );
};

useGLTF.preload(FISH_URLS);
