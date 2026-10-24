import type { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useAquarium } from '../state/store';
import type { Viewpoint } from '../state/store';
import {
  createAmbientCycle,
  driftDelta,
  interruptAmbient,
  startAmbient,
  stepAmbient,
} from './ambient';

const cycle = createAmbientCycle();
const drift = { azimuth: 0, polar: 0 };
/** The cut this component asked for, so the store echo is not mistaken for the visitor's choice. */
let ownCut: Viewpoint | null = null;

const reducedMotion =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

/**
 * Ambient mode: moves the camera through the shots on its own, with a slow sway on each. The
 * visitor taking the camera (orbit, zoom, a click, or picking a shot) holds the current shot
 * until they leave it alone for a while. Drives `CameraRig` through the store's viewpoint and
 * the default `CameraControls`, so the rig itself does not need to know about it.
 */
export const AmbientDirector = () => {
  const controls = useThree((state) => state.controls) as CameraControls | null;
  const ambient = useAquarium((state) => state.ambient);

  useEffect(() => {
    if (!ambient) return;
    startAmbient(cycle);
    return useAquarium.subscribe((state, previous) => {
      if (state.viewpoint === previous.viewpoint) return;
      if (state.viewpoint !== ownCut) interruptAmbient(cycle);
      ownCut = null;
    });
  }, [ambient]);

  useEffect(() => {
    if (!ambient || !controls) return;
    const interrupt = () => interruptAmbient(cycle);
    // Wheel zoom only sends 'control'; drags and touches send 'controlstart' first.
    controls.addEventListener('controlstart', interrupt);
    controls.addEventListener('control', interrupt);
    return () => {
      controls.removeEventListener('controlstart', interrupt);
      controls.removeEventListener('control', interrupt);
    };
  }, [ambient, controls]);

  useFrame((_, delta) => {
    if (!ambient || !controls) return;
    const { viewpoint, setViewpoint } = useAquarium.getState();
    const driftFrom = cycle.driftTime;
    const next = stepAmbient(cycle, delta, viewpoint);
    if (next) {
      ownCut = next;
      setViewpoint(next);
      return;
    }
    // The follow-cam places the camera itself every frame; drift would only fight it.
    if (driftFrom < 0 || viewpoint === 'follow' || reducedMotion?.matches) return;
    driftDelta(driftFrom, cycle.driftTime - driftFrom, drift);
    // Transitioned, so the sway eases in with the rig's damping and never cancels a cut in flight.
    void controls.rotate(drift.azimuth, drift.polar, true);
  });

  return null;
};
