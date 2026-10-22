# Archive: v0.1 (pre-rebuild) documents

Everything in this folder describes the **v0.1 codebase** (up to tag `v0.1.13`): a Miniplex ECS
with Rapier physics, worker-pool boids with shared/transfer buffers, WebGL/WebGPU dual materials
and a four-level adaptive quality system. The v0.2.0 rebuild (PR #167) replaced all of it, so
**none of these files describe the current `src/`**. They are kept for history and for ideas.

For the current architecture, start at [AGENTS.md](../../../AGENTS.md) and
[docs/agents](../../agents).

| Path                                        | What it was                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `superpowers/specs`, `superpowers/plans`    | Design specs and implementation plans for v0.1 phases 1–7, issues #141 and #146, and the September 2026 refactor      |
| `plans-conductor/`                          | Conductor-agent plans for the "aquarium visual upgrade pack" and a fluid-sim plan (formerly `plans/`)                 |
| `plan/`                                     | Early development plan and fluid-simulation notes (formerly `plan/`)                                                  |
| `performance/`                              | Adaptive quality, fixed-step refresh-rate, frame-loop telemetry, zero-copy transport and the adaptive-performance PoC |
| `reviews/`                                  | Renderer-parity (#140) and visual-verification (#146) reviews with screenshots                                        |
| `notes/react-three-webgpu-upgrade-notes.md` | Notes on upgrading to the R3F/drei WebGPU releases                                                                    |
| `jules/ideas.md`                            | Visual-improvement ideas from Jules (post-processing, caustics and god rays all landed in v0.2.0 in some form)        |
| `screenshots/`                              | Old README and docs screenshots of the v0.1 scene                                                                     |

The matching memory-bank history lives in `memory/designs/COMPLETED/` and
`memory/tasks/COMPLETED/`.
