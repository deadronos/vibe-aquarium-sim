import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TANK_ORIGIN } from '../config/scene';
import { prefersReducedMotion } from '../state/motion';
import { useAquarium } from '../state/store';
import type { Viewpoint } from '../state/store';
import { simulation } from './fish/simulation';
import { focus } from './focus';
import { BASE_FOV } from './framing';
import type { Framing } from './framing';
import { REACH, SHOTS, followPosition, frameFor } from './shots';

const [TX, TY, TZ] = TANK_ORIGIN;

const fishWorld = new THREE.Vector3();
const desired = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const heldOn = new THREE.Vector3();

/** With reduced motion the follow cam holds still and cuts again once the fish strays this far. */
const FOLLOW_RECUT = 0.18;

export const CameraRig = () => {
  const controls = useRef<CameraControls>(null);
  const followIndex = useRef(0);
  const fov = useRef({ target: BASE_FOV, snap: true });
  const framed = useRef<Framing | null>(null);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const aspectNow = useRef(aspect);
  const followHeld = useRef(false);

  useEffect(() => {
    const c = controls.current!;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(...REACH.min), new THREE.Vector3(...REACH.max)));
    c.boundaryEnclosesCamera = true;

    // Reduced motion turns every camera move into a cut.
    const go = (viewpoint: Viewpoint, transition: boolean) => {
      const animate = transition && !prefersReducedMotion();
      fov.current.snap = !animate;
      if (viewpoint === 'follow') {
        followIndex.current = Math.floor(Math.random() * simulation.school.count);
        followHeld.current = false;
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
    const animate = !prefersReducedMotion();
    fov.current = { target: framing.fov, snap: !animate };
    framed.current = framing;
    void controls.current?.setLookAt(...framing.position, ...shot.target, animate);
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
      followPosition(fishWorld, desired);
      // Without reduced motion the camera drifts after the fish every frame. With it, the shot
      // holds still and cuts to the fish again only once it swims out of the middle of the frame.
      const reduced = prefersReducedMotion();
      if (!reduced || !followHeld.current || fishWorld.distanceTo(heldOn) > FOLLOW_RECUT) {
        followHeld.current = reduced;
        heldOn.copy(fishWorld);
        void c.setLookAt(
          desired.x,
          desired.y,
          desired.z,
          fishWorld.x,
          fishWorld.y,
          fishWorld.z,
          !reduced
        );
      }
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
