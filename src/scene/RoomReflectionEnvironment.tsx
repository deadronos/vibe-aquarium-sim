import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../config/scene';
import { useAquarium } from '../state/store';
import { daylight } from './daylight';
import { release, retain, useDispose } from './dispose';
import { precompile } from './precompile';
import { registerRoomReflectionPreparation, RoomReflectionSchedule } from './roomReflection';
import { waterUniforms } from './tank/underwater';

export const AQUARIUM_REFLECTION_EXCLUSION = 'aquarium-reflection-exclusion';

const CUBE_SIZE = 128;

/** Throttled real-room environment capture, excluding the aquarium itself. */
export const RoomReflectionEnvironment = () => {
  const { gl, scene, camera: mainCamera } = useThree();
  const target = useMemo(
    () =>
      new THREE.WebGLCubeRenderTarget(CUBE_SIZE, {
        type: THREE.HalfFloatType,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
      }),
    []
  );
  const camera = useMemo(() => {
    const cube = new THREE.CubeCamera(0.05, 20, target);
    cube.position.set(TANK_ORIGIN[0], TANK_ORIGIN[1] + TANK.waterLevel * 0.55, TANK_ORIGIN[2]);
    cube.updateMatrixWorld(true);
    return cube;
  }, [target]);
  const pmremGenerator = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);
  const pmremTarget = useRef<THREE.WebGLRenderTarget | null>(null);
  const schedule = useMemo(() => new RoomReflectionSchedule(), []);
  const ready = useAquarium((state) => state.ready);
  useDispose(target);
  useDispose(pmremGenerator);

  const capture = useCallback(
    (now: number) => {
      const aquarium = scene.getObjectByName(AQUARIUM_REFLECTION_EXCLUSION);
      if (!aquarium) return;

      const aquariumVisible = aquarium.visible;
      const previousEnvironment = scene.environment;
      const previousReflection = waterUniforms.uRoomReflection.value;
      const previousStrength = waterUniforms.uRoomReflectionStrength.value;
      let captured = false;
      try {
        aquarium.visible = false;
        scene.environment = null;
        waterUniforms.uRoomReflection.value = null;
        waterUniforms.uRoomReflectionStrength.value = 0;
        camera.update(gl, scene);
        pmremTarget.current = pmremGenerator.fromCubemap(
          target.texture,
          pmremTarget.current ?? undefined
        );
        scene.environment = pmremTarget.current.texture;
        waterUniforms.uRoomReflection.value = target.texture;
        waterUniforms.uRoomReflectionStrength.value = 1;
        schedule.commit(now, daylight);
        captured = true;
      } finally {
        aquarium.visible = aquariumVisible;
        if (!captured) {
          scene.environment = previousEnvironment;
          waterUniforms.uRoomReflection.value = previousReflection;
          waterUniforms.uRoomReflectionStrength.value = previousStrength;
        }
      }
    },
    [camera, gl, pmremGenerator, scene, schedule, target.texture]
  );

  useLayoutEffect(() => {
    const unregister = registerRoomReflectionPreparation(async () => {
      capture(0);
      await precompile(gl, scene, mainCamera);
    });
    return unregister;
  }, [capture, gl, mainCamera, scene]);

  useLayoutEffect(() => {
    const output = pmremTarget.current;
    if (output) retain(output);
    return () => {
      const output = pmremTarget.current;
      if (!output) return;
      if (scene.environment === output.texture) scene.environment = null;
      if (waterUniforms.uRoomReflection.value === target.texture) {
        waterUniforms.uRoomReflection.value = null;
        waterUniforms.uRoomReflectionStrength.value = 0;
      }
      release(output, () => output.dispose());
    };
  }, [scene, target.texture]);

  useFrame(({ clock }) => {
    if (!schedule.needsCapture(clock.elapsedTime, daylight, ready)) return;
    capture(clock.elapsedTime);
  });

  return null;
};
