# Vibe Aquarium Sim - AI Coding Instructions

This project follows a modular documentation structure for progressive disclosure.

## 📖 Documentation Modules

Please consult the following for detailed guidelines:

- **[Architecture](file:///d:/GitHub/vibe-aquarium-sim/docs/agents/architecture.md)**: ECS (Miniplex) + Physics (Rapier) bidirectional data flow.
- **[Performance](file:///d:/GitHub/vibe-aquarium-sim/docs/agents/performance.md)**: Memory discipline and vector reuse in render loops.
- **[Workflow](file:///d:/GitHub/vibe-aquarium-sim/docs/agents/workflow.md)**: Memory bank conventions and spec-driven coding process.
- **[Project Map](file:///d:/GitHub/vibe-aquarium-sim/docs/agents/project-map.md)**: Core file locations and architectural roles.

## 🛠️ Essential Environment
- **Package Manager**: npm
- **Framework**: React 19 + Vite + TypeScript
- **Memory Bank**: `memory/` folder

> [!IMPORTANT]
> Read `.prettierrc` and `eslint.config.js`. After edits, run `npm run format` and `npm run lint -- --max-warnings=0`.
