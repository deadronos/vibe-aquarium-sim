import { RigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import { Text, MeshTransmissionMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useEffect, useMemo, useRef } from 'react';

import { TANK_DIMENSIONS } from '../config/constants';

import { useVisualQuality } from '../performance/VisualQualityContext';
import { causticsFragmentShader, causticsVertexShader } from '../shaders/causticsShader';
import { logShaderOnce } from '../utils/shaderDebug';
import { GlassNodeMaterial } from './materials/GlassNodeMaterial';
import { TankCausticsNodeMaterial } from './materials/TankCausticsNodeMaterial';

export const Tank = () => {
  const { width, height, depth, wallThickness, floorThickness } = TANK_DIMENSIONS;
  const { isWebGPU } = useVisualQuality();



  const mergedGeometry = useMemo(() => {
    // Helper to create a box geometry with offset
    const createWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const geo = new BoxGeometry(w, h, d);
      geo.translate(x, y, z);
      return geo;
    };

    const back = createWall(
      width + wallThickness * 2,
      height,
      wallThickness,
      0,
      0,
      -depth / 2 - wallThickness / 2
    );
    const front = createWall(
      width + wallThickness * 2,
      height,
      wallThickness,
      0,
      0,
      depth / 2 + wallThickness / 2
    );
    const right = createWall(wallThickness, height, depth, width / 2 + wallThickness / 2, 0, 0);
    const left = createWall(wallThickness, height, depth, -width / 2 - wallThickness / 2, 0, 0);

    const parts = [back, front, right, left];
    try {
      const merged = BufferGeometryUtils.mergeGeometries(parts);
      return merged ?? new BufferGeometry();
    } catch (error) {
      console.error('Failed to merge tank geometries:', error);
      return new BufferGeometry();
    } finally {
      for (const g of parts) g.dispose();
    }
  }, [width, height, depth, wallThickness]);

  useEffect(() => {
    return () => {
      mergedGeometry.dispose();
    };
  }, [mergedGeometry]);

  return (
    <group>
      <TankCausticsOverlay />

      {/* Floor */}
      <RigidBody
        type="fixed"
        position={[0, -height / 2 - floorThickness / 2, 0]}
        restitution={0.2}
        friction={1}
      >
        <Box
          args={[width + floorThickness * 2, floorThickness, depth + floorThickness * 2]}
          receiveShadow
        >
          <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} />
        </Box>
      </RigidBody>

      {/* Ceiling (Invisible barrier) */}
      <RigidBody type="fixed" position={[0, height / 2 + floorThickness / 2, 0]}>
        <Box args={[width, floorThickness, depth]} visible={false} />
      </RigidBody>

      {/* Invisible Colliders for Walls (Physics only) */}
      <RigidBody type="fixed" position={[0, 0, -depth / 2 - wallThickness / 2]}>
        <Box args={[width + wallThickness * 2, height, wallThickness]} visible={false} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, 0, depth / 2 + wallThickness / 2]}>
        <Box args={[width + wallThickness * 2, height, wallThickness]} visible={false} />
      </RigidBody>
      <RigidBody type="fixed" position={[width / 2 + wallThickness / 2, 0, 0]}>
        <Box args={[wallThickness, height, depth]} visible={false} />
      </RigidBody>
      <RigidBody type="fixed" position={[-width / 2 - wallThickness / 2, 0, 0]}>
        <Box args={[wallThickness, height, depth]} visible={false} />
      </RigidBody>

      {/* Visual Glass (Single Mesh) */}
      <mesh geometry={mergedGeometry} castShadow receiveShadow>
        {isWebGPU ? (
          <GlassNodeMaterial
            color="white"
            roughness={0.05}
            transmission={0.99}
            thickness={1.5}
            opacity={1.0}
            ior={1.5}
            chromaticAberration={0.06}
          />
        ) : (
          <meshStandardMaterial
            color="white"
            roughness={0.1}
            metalness={0.1}
            transparent={true}
            opacity={0.3}
            side={2} // DoubleSide from THREE
          />
        )}
      </mesh>

      {/* <Text ... > commented out due to missing export */}
      {/*
      <Text
        position={[0, -height / 2 + 0.2, -depth / 2 + 0.1]}
        fontSize={0.3}
        color="white"
        anchorY="bottom"
      >
        Vibe Aquarium
      </Text>

      <Text
        position={[0, height / 2 - 0.5, -depth / 2 + 0.1]}
        fontSize={0.15}
        color="#aaddff"
        anchorY="top"
        fillOpacity={0.7}
      >
        Click tank to feed fish
      </Text>
      */}
    </group>
  );
};

const CAUSTICS_OVERLAY_INSET = 0.003;

const TankCausticsOverlayEnabled = () => {
  const materialRef = useRef<ShaderMaterial>(null);
  const { width, height, depth } = TANK_DIMENSIONS;
  const { isWebGPU } = useVisualQuality();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      intensity: { value: 0.85 },
      scale: { value: 1.35 },
      speed: { value: 0.45 },
      color: { value: new Color('#aaddff') },
    }),
    []
  );

  const geometry = useMemo(() => {
    const floor = new PlaneGeometry(width, depth);
    floor.rotateX(-Math.PI / 2);
    floor.translate(0, -height / 2 + CAUSTICS_OVERLAY_INSET, 0);

    const back = new PlaneGeometry(width, height);
    back.translate(0, 0, -depth / 2 + CAUSTICS_OVERLAY_INSET);

    const front = new PlaneGeometry(width, height);
    front.rotateY(Math.PI);
    front.translate(0, 0, depth / 2 - CAUSTICS_OVERLAY_INSET);

    const right = new PlaneGeometry(depth, height);
    right.rotateY(-Math.PI / 2);
    right.translate(width / 2 - CAUSTICS_OVERLAY_INSET, 0, 0);

    const left = new PlaneGeometry(depth, height);
    left.rotateY(Math.PI / 2);
    left.translate(-width / 2 + CAUSTICS_OVERLAY_INSET, 0, 0);

    const parts = [floor, back, front, right, left];
    try {
      const merged = BufferGeometryUtils.mergeGeometries(parts);
      return merged ?? new BufferGeometry();
    } catch (error) {
      console.error('Failed to merge caustics geometries:', error);
      return new BufferGeometry();
    } finally {
      for (const g of parts) g.dispose();
    }
  }, [depth, height, width]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((state: any) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.time.value = state.clock?.elapsedTime || performance.now() / 1000;
  });

  return (
    <mesh geometry={geometry}>
      {isWebGPU ? (
        <TankCausticsNodeMaterial
          color="#aaddff"
          intensity={0.85}
          scale={1.35}
          speed={0.45}
        />
      ) : (
        <shaderMaterial
          ref={materialRef}
          vertexShader={causticsVertexShader}
          fragmentShader={causticsFragmentShader}
          onBeforeCompile={(shader: any) => logShaderOnce('Tank/Caustics', shader)}
          uniforms={uniforms}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
        />
      )}
    </mesh>
  );
};

export const TankCausticsOverlay = () => {
  const { causticsEnabled } = useVisualQuality();
  if (!causticsEnabled) return null;
  return <TankCausticsOverlayEnabled />;
};
