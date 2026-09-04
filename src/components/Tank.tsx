import { RigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, BufferGeometry, Color, PlaneGeometry, ShaderMaterial } from 'three';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useEffect, useMemo, useRef } from 'react';

import { TANK_DIMENSIONS } from '../config/constants';
import {
  AQUARIUM_PALETTE,
  CAUSTICS_MATERIAL,
  GLASS_MATERIAL,
} from '../config/artDirection';

import { useVisualQuality } from '../performance/VisualQualityContext';

type ShaderWithProgram = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
};
import { causticsFragmentShader, causticsVertexShader } from '../shaders/causticsShader';
import { logShaderOnce } from '../utils/shaderDebug';
import { GlassNodeMaterial } from './materials/GlassNodeMaterial';
import { TankCausticsNodeMaterial } from './materials/TankCausticsNodeMaterial';

export const Tank = () => {
  const { width, height, depth, wallThickness, floorThickness } = TANK_DIMENSIONS;
  const { isWebGPU, tankTransmissionEnabled, tankTransmissionDispersionEnabled } =
    useVisualQuality();
  const useTransmissiveGlass = isWebGPU && tankTransmissionEnabled;

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
    const merged = BufferGeometryUtils.mergeGeometries(parts);
    for (const g of parts) g.dispose();
    return merged || new BufferGeometry();
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
          <meshStandardMaterial
            color={AQUARIUM_PALETTE.standInset}
            roughness={0.94}
            transparent
            opacity={0.96}
          />
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
        {useTransmissiveGlass ? (
          <GlassNodeMaterial
            color={AQUARIUM_PALETTE.glassTint}
            roughness={GLASS_MATERIAL.roughness}
            transmission={GLASS_MATERIAL.transmission}
            thickness={GLASS_MATERIAL.thickness}
            opacity={1}
            ior={GLASS_MATERIAL.ior}
            chromaticAberration={
              tankTransmissionDispersionEnabled ? GLASS_MATERIAL.dispersion : 0
            }
          />
        ) : (
          <meshStandardMaterial
            color={AQUARIUM_PALETTE.glassTint}
            roughness={GLASS_MATERIAL.roughness}
            metalness={0.1}
            transparent
            opacity={GLASS_MATERIAL.standardOpacity}
            side={THREE.DoubleSide}
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
      intensity: { value: CAUSTICS_MATERIAL.intensity },
      scale: { value: CAUSTICS_MATERIAL.scale },
      speed: { value: CAUSTICS_MATERIAL.speed },
      color: { value: new Color(AQUARIUM_PALETTE.waterHighlight) },
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
    const merged = BufferGeometryUtils.mergeGeometries(parts);
    for (const g of parts) g.dispose();
    return merged || new BufferGeometry();
  }, [depth, height, width]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.time.value =
      (state as { clock?: { elapsedTime: number } }).clock?.elapsedTime ?? performance.now() / 1000;
  });

  return (
    <mesh geometry={geometry}>
      {isWebGPU ? (
        <TankCausticsNodeMaterial
          color={AQUARIUM_PALETTE.waterHighlight}
          intensity={CAUSTICS_MATERIAL.intensity}
          scale={CAUSTICS_MATERIAL.scale}
          speed={CAUSTICS_MATERIAL.speed}
        />
      ) : (
        <shaderMaterial
          ref={materialRef}
          vertexShader={causticsVertexShader}
          fragmentShader={causticsFragmentShader}
          onBeforeCompile={(shader: ShaderWithProgram) => logShaderOnce('Tank/Caustics', shader)}
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
