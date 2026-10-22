import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TANK, TANK_ORIGIN, substrateHeight } from '../../config/scene';
import { DRIFTWOOD, PLANTS, ROCKS, scatter } from '../../sim/aquascape';
import type { PlantClump } from '../../sim/aquascape';
import { createRandom } from '../../sim/random';
import { barkTexture, sandTexture } from '../textures';
import { makeUnderwater } from './underwater';

const W = TANK.width - TANK.glass * 2;
const D = TANK.depth - TANK.glass * 2;

/** Top surface plus skirts down to the glass floor, so the sand bed reads in cross-section. */
const buildSubstrate = () => {
  const nx = 90;
  const nz = 36;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const random = createRandom(13);
  const grid: number[] = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = -W / 2 + (W * i) / nx;
      const z = -D / 2 + (D * j) / nz;
      const y = substrateHeight(x, z) + random.range(-0.0015, 0.0015);
      grid.push(positions.length / 3);
      positions.push(x, y, z);
      uvs.push(x * 2.2, z * 2.2);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Skirts: along each edge, duplicate the edge vertices at y = 0.
  const skirt = (edge: number[], flip: boolean) => {
    const base = positions.length / 3;
    edge.forEach((index, k) => {
      const x = positions[index * 3]!;
      const y = positions[index * 3 + 1]!;
      const z = positions[index * 3 + 2]!;
      positions.push(x, y, z, x, 0, z);
      const u = (Math.abs(x) > W / 2 - 0.001 ? z : x) * 2.2;
      uvs.push(u, y * 2.2, u, 0);
      if (k > 0) {
        const p = base + (k - 1) * 2;
        const q = base + k * 2;
        if (flip) indices.push(p, q, p + 1, q, q + 1, p + 1);
        else indices.push(p, p + 1, q, q, p + 1, q + 1);
      }
    });
  };
  const row = (j: number) => Array.from({ length: nx + 1 }, (_, i) => j * (nx + 1) + i);
  const col = (i: number) => Array.from({ length: nz + 1 }, (_, j) => j * (nx + 1) + i);
  skirt(row(nz), false);
  skirt(row(0), true);
  skirt(col(0), false);
  skirt(col(nx), true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
};

/** Noise-displaced icosphere with sedimentary banding in the vertex colours. */
const buildRock = (seed: number) => {
  const random = createRandom(seed * 101);
  // Icosahedron faces don't share vertices; weld them so normals come out smooth.
  const ico = new THREE.IcosahedronGeometry(1, 6);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const geo = mergeVertices(ico);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const waves = Array.from({ length: 14 }, (_, k) => ({
    dir: new THREE.Vector3(
      random.range(-1, 1),
      random.range(-1, 1),
      random.range(-1, 1)
    ).normalize(),
    freq: random.range(1.5, 4) * (1 + k * 0.45),
    amp: random.range(0.05, 0.13) / (1 + k * 0.35),
    phase: random.range(0, 6),
  }));
  // A few planar cuts give the stone flat, fractured faces.
  const cuts = Array.from({ length: 5 }, () => ({
    n: new THREE.Vector3(
      random.range(-1, 1),
      random.range(-0.2, 1),
      random.range(-1, 1)
    ).normalize(),
    d: random.range(0.68, 0.85),
  }));
  const v = new THREE.Vector3();
  const colors: number[] = [];
  const base = new THREE.Color('#6a6961');
  const light = new THREE.Color('#8f8b7e');
  const dark = new THREE.Color('#4f4f4a');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1;
    for (const w of waves)
      r += Math.abs(Math.sin(v.dot(w.dir) * w.freq + w.phase)) * w.amp - w.amp * 0.5;
    v.multiplyScalar(r);
    for (const cut of cuts) {
      const over = v.dot(cut.n) - cut.d;
      if (over > 0) v.addScaledVector(cut.n, -over * 0.92);
    }
    if (v.y < -0.35) v.y = -0.35 - (v.y + 0.35) * 0.15; // sit flat on the sand
    pos.setXYZ(i, v.x, v.y, v.z);
    const band = Math.sin(v.y * 16 + v.x * 3 + Math.sin(v.z * 7) * 0.6) * 0.5 + 0.5;
    c.copy(base).lerp(band > 0.75 ? light : dark, Math.abs(band - 0.5) * 0.9);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
};

/** Tube along a curve whose radius tapers towards the tip. */
const taperedTube = (
  curve: THREE.Curve<THREE.Vector3>,
  segments: number,
  radial: number,
  r0: number,
  r1: number
) => {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, p);
    const radius = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.8)) * (1 + Math.sin(t * 37) * 0.08);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      n.copy(frames.normals[i]!)
        .multiplyScalar(Math.cos(a))
        .addScaledVector(frames.binormals[i]!, Math.sin(a));
      positions.push(p.x + n.x * radius, p.y + n.y * radius, p.z + n.z * radius);
      uvs.push(j / radial, t * 3);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
};

const buildDriftwood = () => {
  const v = (p: readonly number[]) => new THREE.Vector3(p[0], p[1], p[2]);
  const main = new THREE.CatmullRomCurve3(DRIFTWOOD.map(v));
  const branchA = new THREE.CatmullRomCurve3([
    v(DRIFTWOOD[2]!),
    new THREE.Vector3(0.22, 0.33, -0.12),
    new THREE.Vector3(0.17, 0.4, -0.09),
  ]);
  const branchB = new THREE.CatmullRomCurve3([
    v(DRIFTWOOD[3]!),
    new THREE.Vector3(0.44, 0.27, -0.09),
    new THREE.Vector3(0.52, 0.22, -0.05),
  ]);
  return [
    taperedTube(main, 60, 10, 0.03, 0.007),
    taperedTube(branchA, 24, 8, 0.014, 0.004),
    taperedTube(branchB, 24, 8, 0.013, 0.004),
  ];
};

/** A blade strip from y = 0 to y = 1 with a tapering width and a base-to-tip colour ramp. */
const buildBlade = (
  segments: number,
  width: number,
  profile: (t: number) => number,
  arch: number,
  base: string,
  tip: string
) => {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const cBase = new THREE.Color(base);
  const cTip = new THREE.Color(tip);
  const c = new THREE.Color();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = width * profile(t);
    const z = arch * t * t;
    const y = arch > 0 ? t * (1 - arch * 0.4 * t) : t;
    positions.push(-w / 2, y, z, w / 2, y, z);
    c.copy(cBase).lerp(cTip, t);
    colors.push(c.r, c.g, c.b, c.r * 0.9, c.g * 0.9, c.b * 0.9);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
};

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

const PLANT_GEOMETRY = {
  ribbon: () => buildBlade(10, 0.012, (t) => 1 - t * 0.5, 0.05, '#2d5a2a', '#7fae4f'),
  sword: () =>
    buildBlade(
      8,
      0.32,
      (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.8) * 0.12 + 0.01,
      0.55,
      '#2f5d2c',
      '#5f9a3f'
    ),
  carpet: () => buildBlade(3, 0.32, (t) => 1 - t * 0.7, 0.25, '#3e7a2e', '#8cc65a'),
};

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
    <group position={TANK_ORIGIN as unknown as [number, number, number]}>
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
