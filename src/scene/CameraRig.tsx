import { CameraControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ROOM, TANK, TANK_ORIGIN } from '../config/scene';
import { useAquarium } from '../state/store';
import type { Viewpoint } from '../state/store';
import { simulation } from './fish/simulation';
import { focus } from './focus';

type Shot = {
  position: [number, number, number];
  target: [number, number, number];
  range: number;
  bokeh: number;
};

const [TX, TY, TZ] = TANK_ORIGIN;
const TANK_MID_Y = TY + TANK.waterLevel / 2;

const SHOTS: Record<Exclude<Viewpoint, 'follow'>, Shot> = {
  sofa: {
    position: [0.55, 1.38, 2.3],
    target: [TX - 0.05, TANK_MID_Y + 0.08, TZ],
    range: 2.6,
    bokeh: 1.2,
  },
  tank: {
    position: [0.1, TANK_MID_Y + 0.08, TZ + 1.35],
    target: [TX, TANK_MID_Y, TZ],
    range: 0.9,
    bokeh: 2,
  },
  glass: {
    position: [0.22, TANK_MID_Y + 0.02, TZ + 0.62],
    target: [TX + 0.05, TANK_MID_Y - 0.02, TZ - 0.05],
    range: 0.35,
    bokeh: 3,
  },
  room: { position: [2.55, 1.85, 2.15], target: [-0.45, 0.95, -1.3], range: 4, bokeh: 0.6 },
};

const FRONT_GLASS_Z = TZ + TANK.depth / 2;
const fishWorld = new THREE.Vector3();
const desired = new THREE.Vector3();
const lookAt = new THREE.Vector3();

export const CameraRig = () => {
  const controls = useRef<CameraControls>(null);
  const followIndex = useRef(0);

  useEffect(() => {
    const c = controls.current!;
    const inset = 0.25;
    c.setBoundary(
      new THREE.Box3(
        new THREE.Vector3(-ROOM.width / 2 + inset, 0.3, -ROOM.depth / 2 + inset),
        new THREE.Vector3(ROOM.width / 2 - inset, ROOM.height - inset, ROOM.depth / 2 - inset)
      )
    );
    c.boundaryEnclosesCamera = true;

    const go = (viewpoint: Viewpoint, animate: boolean) => {
      if (viewpoint === 'follow') {
        followIndex.current = Math.floor(Math.random() * simulation.school.count);
        c.smoothTime = 0.45;
        return;
      }
      const shot = SHOTS[viewpoint];
      c.smoothTime = 0.9;
      void c.setLookAt(...shot.position, ...shot.target, animate);
    };
    go(useAquarium.getState().viewpoint, false);
    return useAquarium.subscribe((state, previous) => {
      if (state.viewpoint !== previous.viewpoint) go(state.viewpoint, true);
    });
  }, []);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const { viewpoint } = useAquarium.getState();
    if (viewpoint === 'follow') {
      const i = followIndex.current;
      const { pos } = simulation.school;
      fishWorld.set(pos[i * 3]! + TX, pos[i * 3 + 1]! + TY, pos[i * 3 + 2]! + TZ);
      desired.set(
        fishWorld.x * 0.7 + TX * 0.3,
        fishWorld.y + 0.06,
        Math.max(fishWorld.z + 0.5, FRONT_GLASS_Z + 0.2)
      );
      void c.setLookAt(
        desired.x,
        desired.y,
        desired.z,
        fishWorld.x,
        fishWorld.y,
        fishWorld.z,
        true
      );
      focus.point.copy(fishWorld);
      focus.range = 0.25;
      focus.bokeh = 3.5;
    } else {
      c.getTarget(lookAt, true);
      focus.point.copy(lookAt);
      focus.range = SHOTS[viewpoint].range;
      focus.bokeh = SHOTS[viewpoint].bokeh;
    }
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={0.25}
      maxDistance={6}
      dollySpeed={0.4}
    />
  );
};
