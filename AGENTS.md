# Vibe Aquarium Sim - AI Agent Guide

## 🌊 Project Overview

Vibe Aquarium Sim is a relaxing, physics-based aquarium simulation built with React, Three.js, and Rapier Physics. The goal is to create a visually pleasing and performant simulation of aquatic life using an Entity-Component-System (ECS) architecture.

## 🤖 Primary Directives for AI Agents

### 1. Consult Technical Instructions

**CRITICAL**: Before generating code, you MUST read and follow the detailed architectural rules defined in:
👉 **[.github/copilot-instructions.md](.github/copilot-instructions.md)**

Read .prettierrc and eslint.config.js, follow the rules exactly. After making edits run npm run format and npm run lint --max-warnings=0. Don’t add unrelated changes; keep diffs minimal.

That file contains the "Source of Truth" loop logic, ECS patterns, and performance constraints (vector reuse) that are non-negotiable.

### 2. Core Principles

- **Performance is Paramount**: We are targeting 60+ FPS. Avoid object allocation in render loops (`useFrame`). Reuse vectors and matrices.
- **Physics-Driven**: Movement is handled by Rapier. Do not manually teleport entities unless spawning/respawning. Apply forces/impulses instead.
- **ECS Architecture**: Logic lives in Systems. State lives in Components/Entities. UI lives in React state (eventually Zustand).

### 3. Tech Stack

- **Framework**: React 19 + Vite
- **3D Engine**: Three.js + @react-three/fiber (R3F)
- **Physics**: @react-three/rapier
- **State/ECS**: Miniplex
- **Language**: TypeScript

## 📂 Key Directories

- `src/systems/`: Logic loops (Boids, Food, etc.)
- `src/components/`: Visual + Physics representations (Fish, Tank)
- `src/store.ts`: ECS World definition

## 📝 Interaction Guidelines

- When modifying systems, always check for memory leaks (new Vector3 in loops).
- Prefer `miniplex` queries over manual array filtering.
- Keep components small and focused.
