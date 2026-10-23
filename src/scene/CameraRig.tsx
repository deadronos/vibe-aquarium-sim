import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../config/scene';
import { useAquarium } from '../state/store';
import type { Viewpoint } from '../state/store';
import { simulation } from './fish/simulation';
import { focus } from './focus';
import { BASE_FOV } from './framing';
import type { Framing } from './framing';
import { REACH, SHOTS, frameFor } from './shots';

const [TX, TY, TZ] = TANK_ORIGIN;

const FRONT_GLASS_Z = TZ + TANK.depth / 2;
const fishWorld = new THREE.Vector3();
const desired = new THREE.Vector3();
const lookAt = new THREE.Vector3();

export const CameraRig = () => {
  const controls = useRef<CameraControls>(null);
  const followIndex = useRef(0);
  const fov = useRef({ target: BASE_FOV, snap: true });
  const framed = useRef<Framing | null>(null);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const aspectNow = useRef(aspect);

  useEffect(() => {
    const c = controls.current!;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(...REACH.min), new THREE.Vector3(...REACH.max)));
    c.boundaryEnclosesCamera = true;

    const go = (viewpoint: Viewpoint, animate: boolean) => {
      fov.current.snap = !animate;
      if (viewpoint === 'follow') {
        followIndex.current = Math.floor(Math.random() * simulation.school.count);
        c.smoothTime = 0.45;
        fov.current.target = BASE_FOV;
        framed.current = null;
        return;
      }
      const shot = SHOTS[viewpoint];
      const framing = frameFor(shot, aspectNow.current);
      c.smoothTime = 0.9;
      fov.current.target = framing.fov;
      framed.current = framing;
      void c.setLookAt(...framing.position, ...shot.target, animate);
    };
    go(useAquarium.getState().viewpoint, false);
    return useAquarium.subscribe((state, previous) => {
      if (state.viewpoint !== previous.viewpoint) go(state.viewpoint, true);
    });
  }, []);

  // Re-frame the current shot when the screen changes shape. Shots whose framing does not change
  // (any landscape resize) are left alone so a resize never undoes the visitor's own orbiting.
  useEffect(() => {
    aspectNow.current = aspect;
    const { viewpoint } = useAquarium.getState();
    const previous = framed.current;
    if (viewpoint === 'follow' || !previous) return;
    const shot = SHOTS[viewpoint];
    const framing = frameFor(shot, aspect);
    const moved = framing.position.some((v, i) => Math.abs(v - previous.position[i]!) > 1e-3);
    if (!moved && Math.abs(framing.fov - previous.fov) < 0.05) return;
    fov.current = { target: framing.fov, snap: false };
    framed.current = framing;
    void controls.current?.setLookAt(...framing.position, ...shot.target, true);
  }, [aspect]);

  useFrame((state, delta) => {
    const c = controls.current;
    if (!c) return;
    const camera = state.camera as THREE.PerspectiveCamera;
    const { target, snap } = fov.current;
    if (camera.fov !== target) {
      camera.fov =
        snap || Math.abs(camera.fov - target) < 0.01
          ? target
          : THREE.MathUtils.damp(camera.fov, target, 3, delta);
      camera.updateProjectionMatrix();
    }
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
