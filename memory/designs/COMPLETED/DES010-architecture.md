# Vibe Aquarium Architecture

## Overview

A relaxing 3D aquarium simulation built with React Three Fiber and an Entity Component System (ECS).

## Tech Stack

- **React Three Fiber** - React bindings for Three.js
- **Rapier** - Physics engine via @react-three/rapier
- **Miniplex** - ECS for game state
- **Zustand** - UI state management
- **Vite** - Build tooling

## Directory Structure

```
src/
├── components/       # React/R3F components
│   ├── effects/      # Visual effects (ripples, particles)
│   └── ui/           # HTML overlay UI
├── systems/          # ECS systems (boids, physics, rendering)
├── config/           # Constants and physics config
├── utils/            # Helpers (spatial grid, physics)
├── shaders/          # Custom GLSL shaders
└── assets/           # 3D models, textures
```

## Core Systems

### ECS Architecture (`store.ts`)

Entities have optional components:

- `isFish`, `isBoid`, `isFood`, `isDecoration` - tags
- `position`, `velocity`, `quaternion` - transform
- `steeringForce`, `externalForce` - physics
- `excitementLevel`, `excitementDecay` - behavior state

### Boids System (`systems/BoidsSystem.tsx`)

Classic boids algorithm with:

- **Separation** - avoid crowding neighbors
- **Alignment** - steer towards average heading
- **Cohesion** - steer towards average position
- **Boundary avoidance** - soft steering at tank edges
- **Food seeking** - prioritize nearby food

### Fish Render System (`systems/FishRenderSystem.tsx`)

Instanced rendering for performance:

- Loads GLTF fish model once
- Up to 1000 instances via InstancedMesh
- Stable entity-to-instance mapping with free-list recycling
- Smooth quaternion slerp for turning

### Water Systems

- **WaterResistanceSystem** - Drag force opposing velocity
- **WaterCurrentSystem** - Procedural flow using sine waves

### Physics Integration

- Fish: velocity-driven (no gravity, direct velocity control)
- Food: gravity-affected with high damping
- Decorations: fixed rigid bodies with colliders

## Data Flow

```
┌─────────────────┐
│  BoidsSystem    │──▶ steeringForce
└────────┬────────┘
         │
┌────────▼────────┐
│ WaterResistance │──▶ externalForce
└────────┬────────┘
         │
┌────────▼────────┐
│ WaterCurrent    │──▶ externalForce
└────────┬────────┘
         │
┌────────▼────────┐
│   Fish.tsx      │ Applies forces, updates velocity
└────────┬────────┘
         │
┌────────▼────────┐
│ FishRenderSystem│ Reads position/velocity, updates matrices
└─────────────────┘
```

## UI Layer

- `gameStore.ts` - Zustand for feeding time, decoration mode
- `HUD.tsx` - HTML overlay showing stats
- `FeedingController.tsx` - Click handling for food/decorations
