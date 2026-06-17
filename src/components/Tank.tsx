import { RigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, BufferGeometry, Color, PlaneGeometry, ShaderMaterial } from 'three';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useEffect, useMemo, useRef } from 'react';

import { TANK_DIMENSIONS } from '../config/constants';

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

const GlowingTextPlane = ({
  text,
  position,
  fontSize = 90,
  width = 2.5,
  height = 0.625,
  color = '#30a0ff',
  glowIntensity = 25,
}: {
  text: string;
  position: [number, number, number];
  fontSize?: number;
  width?: number;
  height?: number;
  color?: string;
  glowIntensity?: number;
}) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Underlayer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = glowIntensity;
      ctx.fillStyle = color;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      // Bright core overlay
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text, fontSize, color, glowIntensity]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        toneMapped={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

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
            color="#eef7ff"
            roughness={0.01}
            transmission={0.99}
            thickness={1.5}
            opacity={1.0}
            ior={1.5}
            chromaticAberration={0.06}
          />
        ) : (
          <meshPhysicalMaterial
            color="#eef7ff"
            roughness={0.01}
            metalness={0.0}
            clearcoat={1.0}
            clearcoatRoughness={0.01}
            transmission={0.99}
            thickness={1.5}
            ior={1.5}
            opacity={1.0}
            transparent={true}
            depthWrite={true}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      <GlowingTextPlane
        text="Vibe Aquarium"
        position={[0, -height / 2 + 0.35, -depth / 2 + 0.05]}
        fontSize={90}
        width={2.5}
        height={0.625}
        color="#30a0ff"
        glowIntensity={25}
      />

      <GlowingTextPlane
        text="Click tank to feed fish"
        position={[0, height / 2 - 0.5, -depth / 2 + 0.05]}
        fontSize={45}
        width={2.0}
        height={0.5}
        color="#aaddff"
        glowIntensity={15}
      />
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
        <TankCausticsNodeMaterial color="#aaddff" intensity={0.85} scale={1.35} speed={0.45} />
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
