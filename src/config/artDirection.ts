import type { DecorationType } from '../domain/types';

export const AQUARIUM_PALETTE = {
  sceneBackground: '#071c21',
  waterDeep: '#123b43',
  waterSurface: '#1d5960',
  waterHighlight: '#8fc8c0',
  glassTint: '#d8eee9',
  kelp: '#315d4d',
  kelpLight: '#4a7c62',
  rock: '#5f6258',
  rockLight: '#8f8b78',
  coral: '#c87862',
  coralShadow: '#744b4a',
  roomWall: '#343c38',
  roomWallLight: '#4f5148',
  roomFloor: '#786550',
  stand: '#252b2a',
  standInset: '#111917',
  pot: '#59483c',
} as const;

export const ART_DIRECTION_LIGHTING = {
  exposure: 0.92,
  keyColor: '#ffe0b2',
  keyIntensity: 1.5,
  hemisphereSky: '#b9c7c0',
  hemisphereGround: '#50483f',
  hemisphereIntensity: 0.32,
  waterFillColor: '#1f6a73',
  waterFillIntensity: 0.28,
  environmentIntensity: 0.42,
} as const;

export const WATER_MATERIAL = {
  volumeOpacity: 0.38,
  causticsIntensity: 0.18,
  volumeSpecularStrength: 0.1,
  volumeShimmerStrength: 0.07,
  surfaceOpacity: 0.13,
  surfaceStrength: 0.48,
  surfaceShimmerStrength: 0.72,
  surfaceFresnelStrength: 0.7,
} as const;

export const GLASS_MATERIAL = {
  standardOpacity: 0.18,
  roughness: 0.16,
  transmission: 0.92,
  thickness: 0.9,
  ior: 1.46,
  dispersion: 0.025,
} as const;

export const CAUSTICS_MATERIAL = {
  intensity: 0.42,
  scale: 1.35,
  speed: 0.36,
} as const;

export const DECORATION_MATERIAL = {
  roughness: 0.86,
  metalness: 0,
  flatShading: true,
  colors: [AQUARIUM_PALETTE.kelp, AQUARIUM_PALETTE.rock, AQUARIUM_PALETTE.coral] as const,
} as const;

export type DecorationSpawnDescriptor = {
  type: DecorationType;
  x: number;
  z: number;
  props: Record<string, unknown>;
};

type DecorationCluster = {
  name: 'left-reef' | 'right-reef';
  items: readonly DecorationSpawnDescriptor[];
};

const SEAWEED_PROPS = (heights: readonly number[], phase: number) => ({
  blades: heights.map((height, index) => ({
    height,
    offset: (index - 1) * 0.045,
    phase: phase + index * 0.7,
  })),
});

export const DECORATION_CLUSTERS: readonly DecorationCluster[] = [
  {
    name: 'left-reef',
    items: [
      { type: 'seaweed', x: -1.62, z: -0.62, props: SEAWEED_PROPS([0.54, 0.42, 0.48], 0.2) },
      { type: 'seaweed', x: -1.42, z: 0.46, props: SEAWEED_PROPS([0.46, 0.36, 0.5], 1.4) },
      { type: 'seaweed', x: -1.74, z: 0.05, props: SEAWEED_PROPS([0.38, 0.51, 0.43], 2.5) },
      { type: 'coral', x: -1.32, z: -0.38, props: { color: AQUARIUM_PALETTE.coral } },
      { type: 'coral', x: -1.68, z: 0.64, props: { color: AQUARIUM_PALETTE.coralShadow } },
      { type: 'rock', x: -1.5, z: -0.78, props: { scale: 1.15, color: AQUARIUM_PALETTE.rock } },
      {
        type: 'rock',
        x: -1.2,
        z: -0.62,
        props: { scale: 0.82, color: AQUARIUM_PALETTE.rockLight },
      },
      { type: 'rock', x: -1.82, z: 0.38, props: { scale: 0.94, color: AQUARIUM_PALETTE.rock } },
    ],
  },
  {
    name: 'right-reef',
    items: [
      { type: 'seaweed', x: 1.62, z: -0.58, props: SEAWEED_PROPS([0.5, 0.4, 0.56], 0.8) },
      { type: 'seaweed', x: 1.42, z: 0.42, props: SEAWEED_PROPS([0.44, 0.54, 0.38], 2.1) },
      { type: 'seaweed', x: 1.78, z: 0.02, props: SEAWEED_PROPS([0.38, 0.49, 0.45], 3.2) },
      { type: 'coral', x: 1.34, z: -0.36, props: { color: AQUARIUM_PALETTE.coral } },
      { type: 'coral', x: 1.68, z: 0.64, props: { color: AQUARIUM_PALETTE.coralShadow } },
      { type: 'rock', x: 1.5, z: -0.76, props: { scale: 1.1, color: AQUARIUM_PALETTE.rock } },
      { type: 'rock', x: 1.2, z: -0.6, props: { scale: 0.84, color: AQUARIUM_PALETTE.rockLight } },
      { type: 'rock', x: 1.82, z: 0.38, props: { scale: 0.96, color: AQUARIUM_PALETTE.rock } },
    ],
  },
];

export const getDecorationSpawnDescriptors = (): DecorationSpawnDescriptor[] =>
  DECORATION_CLUSTERS.flatMap((cluster) =>
    cluster.items.map((item) => ({
      type: item.type,
      x: item.x,
      z: item.z,
      props: {
        ...item.props,
        ...(item.type === 'seaweed' && Array.isArray(item.props.blades)
          ? { blades: item.props.blades.map((blade) => ({ ...blade })) }
          : {}),
      },
    }))
  );

export type InitialFishSpawn = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  modelIndex: 0 | 1 | 2;
};

export const getInitialFishSpawn = (index: number, total: number): InitialFishSpawn => {
  const columns = Math.max(5, Math.min(12, Math.ceil(Math.sqrt(Math.max(total, 1)))));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const x = columns === 1 ? 0 : -1.48 + (column / (columns - 1)) * 2.96;
  const y = -0.62 + (row % 5) * 0.3 + ((column + row) % 2) * 0.04;
  const z = -0.55 + ((column * 3 + row * 2) % 8) * 0.15;
  const angle = ((index * 37) % 360) * (Math.PI / 180);

  return {
    x,
    y,
    z,
    vx: Math.cos(angle) * 0.16,
    vy: Math.sin(angle * 0.7) * 0.07,
    vz: Math.sin(angle) * 0.16,
    modelIndex: ((index + row) % 3) as 0 | 1 | 2,
  };
};
