# Vibe Aquarium Sim - AI Coding Instructions

A cozy living-room aquarium in React Three Fiber. Start with [AGENTS.md](../AGENTS.md): it
has the commands and the golden rules.

## 📖 Documentation Modules

- **[Architecture](../docs/agents/architecture.md)**: pure-TypeScript sim (`src/sim/`) read by a thin R3F scene; the daylight loop; the `makeUnderwater` shader patch.
- **[Performance](../docs/agents/performance.md)**: zero allocation in frame loops, instancing, on-demand shadows, High/Lite quality.
- **[Workflow](../docs/agents/workflow.md)**: checks to run, testing, releases, memory bank.
- **[Project Map](../docs/agents/project-map.md)**: where things live.

## 🛠️ Essential Environment

- **Package Manager**: npm
- **Framework**: React 19 + Vite + TypeScript + Three.js / @react-three/fiber (WebGL)
- **Memory Bank**: `memory/` folder

> [!IMPORTANT]
> Read `.prettierrc` and `eslint.config.js`. After edits, run `npm run format`, `npm run lint -- --max-warnings=0`, `npm run typecheck` and `npm run test`.
