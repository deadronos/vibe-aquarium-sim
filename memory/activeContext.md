# Active Context

## Current focus

- Branch: `fix/issue-140-webgpu-ghosting-parity`
- Issue #140: deterministic renderer-parity coverage plus a color-management fix so WebGPU/WebGL exposure matches.

## Recent changes

- Added a `?testHarness=1`-gated `window.__vibe_test` harness (`src/utils/testHarness.ts`, `src/systems/TestHarnessDriver.tsx`) that freezes the school, pins fish to scripted poses, and supports constant-velocity motion for deterministic captures.
- Root-caused the WebGPU/WebGL exposure mismatch: the custom GLSL materials (`waterShader`, `waterSurfaceShader`, `causticsShader`, `AmbientParticles`) wrote `gl_FragColor` without three's output pipeline, while their WebGPU node-material equivalents are tone-mapped and color-space converted. Adding `#include <tonemapping_fragment>` / `#include <colorspace_fragment>` brought tank luminance parity from ~21 to ~2 (8-bit scale).
- Added `tests/e2e/renderer-parity.spec.ts`: deterministic both-backend ghost + temporal-stability + exposure assertions. Verified it fails pre-fix (relative exposure 0.283) and passes post-fix (~0.03).
- Confirmed no persistent fish trails/ghosts reproduce on native Metal WebGPU with frozen or scripted motion.

## Next steps

1. Publish the Issue #140 PR with the parity evidence and screenshots.
2. Continue visual parity work in #148 (browser-backed ECS/Rapier coverage).
3. Keep the umbrella issue #150 synchronized with the phase status and acceptance evidence.

## Active decisions / considerations

- **Art direction**: Preserve a deep teal tank, subdued warm room, matte low-poly decor, and fish-first contrast across WebGL/WebGPU and quality levels.
- **Particle Systems**: Use GPU-side wrapping (modulo arithmetic) for ambient/environmental particles to create infinite volumes without CPU allocation or complex buffer management.
- Physics is the authoritative source of truth for simulation state; systems must drive the physics, not directly mutate positions.
- Keep render-loop allocations to a minimum (module-level vector reuse). This is a strict performance constraint for `useFrame`-driven systems.
