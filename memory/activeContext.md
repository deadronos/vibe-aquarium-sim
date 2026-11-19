# Active Context

## Current focus

- Harden interaction and accessibility: hidden HUD controls are inert, with an explicit
  Show controls recovery action; radio groups support roving keyboard focus.
- Strengthen the render smoke gate so it waits for scene readiness and verifies continued frames
  at both Lite and High quality.
- Keep maintained architecture and memory-bank files aligned with `SimulationDriver`, the
  current quality policy, and implemented tank-care actions.
- Suspend WebAudio while muted, benchmark quality modes with an opt-in sampler, and keep Lite
  shadows at 1024 while rebuilding the actual render target on transitions.
- Preserve High rendering without multisampled depth blits on software GL, and keep driftwood
  geometry and capsule collision data shared under `src/sim/`.
- Ground Medium/High furniture with one static instanced contact-shadow batch and project every
  fish onto the sloped substrate with allocation-free instanced blob shadows.

## Recent changes

- v0.2.0 rebuild merged (PR #167). See DES017 for the architecture and TASK019 for the work log.
- Superseded v0.1 designs (DES002–DES016) and tasks (TASK001–TASK018) moved to `COMPLETED/`.
- v0.1-era docs, plans, specs, reviews and screenshots moved to `docs/archive/v0.1/`.

## Next ideas

- Blender-baked room (lightmaps) replacing the procedural furniture.
- A cat that wanders up to the glass; fish react.
- More species and per-fish inspection.

## Active decisions / considerations

- Keep simulation pure TypeScript and unit-tested; keep the scene a thin reader.
- No downloaded textures or room models unless a baked-room pipeline is adopted deliberately.
- Zero allocation in frame loops; instancing and shader-driven motion for anything repeated.
- Procedural contact-shadow masks stay cached; Lite omits the static room batch but keeps the
  single fish blob-shadow draw.
