import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { LAMP, ROOM, WINDOW } from '../config/scene';
import { daylight } from './daylight';

RectAreaLightUniformsLib.init();

const SUN_TARGET = new THREE.Vector3(-0.6, 0.6, -0.8);
const lastSun = new THREE.Vector3();

export const Lights = () => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const windowLight = useRef<THREE.RectAreaLight>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const shadowFrames = useRef(30);

  useLayoutEffect(() => {
    // The room is static, so shadows only re-render when the sun has moved noticeably.
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    const light = sun.current!;
    light.target.position.copy(SUN_TARGET);
    scene.add(light.target);
    windowLight.current!.lookAt(0, WINDOW.centerY, WINDOW.centerZ);
    return () => {
      scene.remove(light.target);
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, scene]);

  useFrame(() => {
    const light = sun.current!;
    light.position.copy(SUN_TARGET).addScaledVector(daylight.sunDirection, -9);
    light.color.copy(daylight.sunColor);
    light.intensity = daylight.sunIntensity;
    if (shadowFrames.current > 0 || lastSun.angleTo(daylight.sunDirection) > 0.004) {
      shadowFrames.current = Math.max(0, shadowFrames.current - 1);
      lastSun.copy(daylight.sunDirection);
      gl.shadowMap.needsUpdate = true;
    }

    hemi.current!.color.copy(daylight.ambientColor);
    hemi.current!.intensity = daylight.ambientIntensity;
    windowLight.current!.color.copy(daylight.skyHorizon).lerp(daylight.skyTop, 0.4);
    windowLight.current!.intensity = 0.4 + daylight.sunIntensity * 1.6;
    lamp.current!.intensity = daylight.lamp * 5.5;
    scene.environmentIntensity = 0.12 + daylight.ambientIntensity * 0.9 + daylight.lamp * 0.12;
  });

  return (
    <>
      <hemisphereLight ref={hemi} groundColor="#6b5444" />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-left={-4.2}
        shadow-camera-right={4.2}
        shadow-camera-top={3.2}
        shadow-camera-bottom={-3.2}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      {/* Soft skylight spilling in from the window. */}
      <rectAreaLight
        ref={windowLight}
        position={[-ROOM.width / 2 + 0.05, WINDOW.centerY, WINDOW.centerZ]}
        width={WINDOW.width}
        height={WINDOW.height}
      />
      <pointLight
        ref={lamp}
        position={[LAMP.x, LAMP.shadeY, LAMP.z]}
        color="#ffc27d"
        distance={7}
        decay={2}
      />
      {/* Reflection-only environment: a window, a ceiling glow and a lamp. Rendered once. */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={3}
          color="#fff4e2"
          position={[-5, 1.4, -0.9]}
          rotation-y={Math.PI / 2}
          scale={[1.6, 1.4, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          color="#fff7ee"
          position={[0, 4, 0]}
          rotation-x={Math.PI / 2}
          scale={[5, 4, 1]}
        />
        <Lightformer
          form="circle"
          intensity={2}
          color="#ffc27d"
          position={[LAMP.x, LAMP.shadeY, LAMP.z]}
          scale={0.4}
        />
        <Lightformer
          form="rect"
          intensity={0.25}
          color="#cfd8d0"
          position={[0, 1.2, 4]}
          rotation-y={Math.PI}
          scale={[6, 3, 1]}
        />
      </Environment>
    </>
  );
};
