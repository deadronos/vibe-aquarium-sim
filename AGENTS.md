# Vibe Aquarium Sim - AI Agent Guide

Vibe Aquarium is a cozy living-room aquarium: a planted tank on a sideboard, a room that follows
the time of day, and a boids school of fish, built with React Three Fiber and Three.js.

## 🚀 Quick Start

- **Run**: `npm run dev`
- **Lint**: `npm run lint -- --max-warnings=0`
- **Typecheck**: `npm run typecheck`
- **Test**: `npm run test` (unit) · `npm run build && npm run test:smoke` (browser)

## 📖 Progressive Disclosure

1.  **[Architecture](docs/agents/architecture.md)**: sim vs. scene split, the daylight loop, the underwater shader patch.
2.  **[Performance](docs/agents/performance.md)**: allocation rules, shadows, quality modes.
3.  **[Workflow](docs/agents/workflow.md)**: checks to run, memory bank.
4.  **[Project Map](docs/agents/project-map.md)**: where things live.
5.  **[Docs index](docs/README.md)**: what is current and what is archived.

## 🧠 Memory Bank

`memory/` holds the project brief, system patterns, progress and design/task records
(conventions: `.github/instructions/memory-bank.instructions.md`). Check `memory/activeContext.md`
for the current focus. Files under `memory/*/COMPLETED/` and everything in `docs/archive/v0.1/`
describe the **pre-rebuild v0.1 codebase** (ECS, Rapier, workers, WebGPU): read them for history
only, never as a description of `src/`.

## 🚢 Releases

Pushing a `v*` tag on the tip of `main` deploys to GitHub Pages after a smoke-test boot check
(`.github/workflows/deploy-pages.yml`). The smoke spec is the deploy gate, so keep it green and
fast.

## ⚠️ The Golden Rules

- **World units are metres.** The room floor is y = 0; tank contents use tank-local space (see `src/config/scene.ts`).
- **Simulation is plain TypeScript.** `src/sim/` has no Three.js or React imports and is unit-tested; the scene only reads it.
- **Zero allocation in loops.** Never call `new Vector3()` (or build objects/arrays) inside `useFrame` or a sim `step`. Reuse module-level scratch objects.
- **Everything under water goes through `makeUnderwater`** so it gets depth absorption (and caustics where lit from above).
- **No new image assets.** Textures are procedural (`src/scene/textures.ts`); only the fish GLBs ship in `public/`.
