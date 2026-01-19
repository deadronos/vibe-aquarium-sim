# Vibe Aquarium Sim - AI Agent Guide

Vibe Aquarium Sim is a relaxing, physics-based aquarium simulation built with React, Three.js, and Rapier Physics using an Entity-Component-System (ECS) architecture.

## 🚀 Quick Start

- **Run**: `npm run dev`
- **Lint**: `npm run lint -- --max-warnings=0`
- **Test**: `npm run test`

## 📖 Progressive Disclosure

For detailed instructions, consult the specific module relevant to your task:

1.  **[Architecture](file:///d:/GitHub/vibe-aquarium-sim/docs/agents/architecture.md)**: ECS + Physics synchronization and the "Source of Truth" loop.
2.  **[Performance](file:///d:/GitHub/vibe-aquarium-sim/docs/agents/performance.md)**: Vector reuse, GC management, and FPS targets.
3.  **[Workflow](file:///d:/GitHub/vibe-aquarium-sim/docs/agents/workflow.md)**: Memory bank, spec-driven workflow, and testing.
4.  **[Project Map](file:///d:/GitHub/vibe-aquarium-sim/docs/agents/project-map.md)**: Directory structure and key file roles.

## ⚠️ The Golden Rules

- **Physics is Truth**: Never update `entity.position` manually. Queue forces/impulses for Rapier instead.
- **Zero Allocation in Loops**: Never call `new Vector3()` or similar inside a `useFrame` or system loop. Reuse module-level variables.
- **Consult Memory Bank**: Always check the `memory/` folder for current task context.
