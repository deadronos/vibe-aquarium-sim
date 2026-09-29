# Active Context

## Current focus

- Branch: `feat/issue-112-species-registry`
- Issue #112: first-class fish species registry with species identity decoupled from the render model.

## Recent changes

- Added `src/domain/species/` (`types.ts`, per-species configs `tetra`/`goldfish`/`betta`, and a registry with helpers). `SPECIES_CONFIG` is derived from the registry for compatibility.
- Decoupled species from render model: entities now carry `speciesId` alongside `modelIndex`; the worker protocol sends a per-fish `speciesIndices` buffer (renamed from `modelIndices`) across shared/transfer/cloned transports.
- `getInitialFishSpawn` and `Spawner` assign species via a deterministic weighted mix (tetra 60%, goldfish 25%, betta 15%); `modelIndex` defaults to the species' preferred model.
- `fishPhysicsStep` now clamps speed using the entity's species params instead of indexing by model.
- Tests: registry integrity/weights, per-species worker steering, snapshot species mapping, and a species-vs-model clamp test.

## Next steps

1. Validate and open the Issue #112 PR; close #112 and update umbrella #150 after merge.
2. Remaining active follow-ups: #148 (browser ECS/Rapier coverage), #111 (DevTools telemetry panel).

## Active decisions / considerations

- **Art direction**: Preserve a deep teal tank, subdued warm room, matte low-poly decor, and fish-first contrast across WebGL/WebGPU and quality levels.
- **Particle Systems**: Use GPU-side wrapping (modulo arithmetic) for ambient/environmental particles to create infinite volumes without CPU allocation or complex buffer management.
- Physics is the authoritative source of truth for simulation state; systems must drive the physics, not directly mutate positions.
- Keep render-loop allocations to a minimum (module-level vector reuse). This is a strict performance constraint for `useFrame`-driven systems.
