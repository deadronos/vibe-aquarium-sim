import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SWIM_BOUNDS, TANK_ORIGIN } from '../../config/scene';
import { OBSTACLES } from '../../sim/aquascape';
import { FOOD_CAPACITY } from '../../sim/food';
import { SPECIES } from '../../sim/species';
import { useAquarium } from '../../state/store';
import { daylight } from '../daylight';
import { makeUnderwater } from '../tank/underwater';
import { FISH_URLS } from './assets';
import { simulation } from './simulation';

const FIXED_STEP = 1 / 60;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const quaternion = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const environment = { activity: 1, food: simulation.food, obstacles: OBSTACLES };

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

export const FishView = () => {
  const gltfs = useGLTF(FISH_URLS);
  const meshes = useRef<(SpeciesMesh | null)[]>([]);
  const accumulator = useRef(0);
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
            key: 'fish',
            caustics: true,
            vertexHead: SWIM_HEAD,
            vertexDeform: SWIM_DEFORM,
          }
        );
        return { geometry, material, swim };
      }),
    [gltfs]
  );

  const foodMaterial = useMemo(
    () =>
      makeUnderwater(
        new THREE.MeshStandardMaterial({
          color: '#c46a2c',
          roughness: 0.8,
          side: THREE.DoubleSide,
        }),
        {
          key: 'food',
        }
      ),
    []
  );
  const foodMesh = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const { setFishCount, setReady } = useAquarium.getState();
    setFishCount(school.count);
    setReady();
    return useAquarium.subscribe((state, previous) => {
      if (state.feedRequest !== previous.feedRequest) {
        const x =
          SWIM_BOUNDS.minX + 0.15 + Math.random() * (SWIM_BOUNDS.maxX - SWIM_BOUNDS.minX - 0.3);
        food.sprinkle(x, (Math.random() - 0.5) * 0.15);
      }
    });
  }, [school, food]);

  useFrame((state, delta) => {
    accumulator.current = Math.min(accumulator.current + delta, FIXED_STEP * 5);
    environment.activity = daylight.fishActivity;
    while (accumulator.current >= FIXED_STEP) {
      school.step(FIXED_STEP, environment);
      food.step(FIXED_STEP, state.clock.elapsedTime);
      accumulator.current -= FIXED_STEP;
    }

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
          scale.setScalar(school.scale[i]!);
          matrix.compose(position, quaternion, scale);
          entry.mesh.setMatrixAt(k, matrix);
          swim[k * 2] = school.phase[i]!;
          swim[k * 2 + 1] = 0.07 + school.effort[i]! * 0.09;
        }
        entry.mesh.instanceMatrix.needsUpdate = true;
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
    <group position={TANK_ORIGIN as unknown as [number, number, number]}>
      {assets.map((asset, s) => (
        <instancedMesh
          key={s}
          ref={(mesh) => {
            meshes.current[s] = mesh ? { mesh, swim: asset.swim } : null;
          }}
          args={[asset.geometry, asset.material, SPECIES[s]!.count]}
          frustumCulled={false}
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
