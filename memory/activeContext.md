# Active Context

## Current focus

- Branch: `rewrite-aquarium-sim` (active PR: "Rewrite Vibe Aquarium Sim")
- Stabilize the ECS ↔ Physics workflow and add robust tests for systems and components

## Recent changes

- Initial rewrite and scaffolding completed: core components and a BoidsSystem are present in `src/systems` and `src/components`.
- Project directives and AI agent instructions were added to `.github/copilot-instructions.md` and `AGENTS.md`.

## Next steps

1. Finish core systems for movement, spawning and food interactions.
2. Add tests covering the ECS ↔ Physics synchronization loop.
3. Add some minimal UI state (Zustand) for runtime controls and debug toggles.

## Active decisions / considerations

- Physics is the authoritative source of truth for simulation state; systems must drive the physics, not directly mutate positions.
- Keep render-loop allocations to a minimum (module-level vector reuse). This is a strict performance constraint for `useFrame`-driven systems.
