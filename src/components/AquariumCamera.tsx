import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { type PerspectiveCamera, Vector3 } from 'three';
import { resizeAquariumCamera } from './cameraFraming';

const ORIGIN = new Vector3();

export const AquariumCamera = () => {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const { width, height } = useThree((state) => state.size);
  const controls = useThree((state) => state.controls);
  const previousDistance = useRef(4.5);

  useLayoutEffect(() => {
    const target = (controls as { target?: Vector3 } | null)?.target ?? ORIGIN;
    previousDistance.current = resizeAquariumCamera(
      camera,
      target,
      previousDistance.current,
      width,
      height
    );
  }, [camera, controls, width, height]);

  return null;
};
