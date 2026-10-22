# Issue 146: Cohesive Aquarium Visuals

## Goal

Establish a calm, slightly cinematic home-aquarium art direction in which the tank is the focal plane, fish silhouettes remain readable, and room, water, glass, lighting, and decorations share one restrained material language across WebGL and WebGPU.

## Requirements

- WHEN the default scene loads, THE SYSTEM SHALL present a deep blue-green aquarium against a subdued warm room with the tank and fish receiving the strongest visual contrast.
- WHEN decorations are spawned, THE SYSTEM SHALL use a consistent stylized-natural family of low-poly forms with shared palette, scale, roughness, and highlight response.
- WHEN the scene is rendered on WebGL or WebGPU, THE SYSTEM SHALL preserve the same palette and lighting hierarchy while using the renderer-specific material paths already supported by the project.
- WHEN quality changes between low, medium, high, and ultra, THE SYSTEM SHALL retain readable fish silhouettes and a coherent composition while only scaling optional detail and GPU cost.
- WHEN the default scene is captured for review, THE SYSTEM SHALL use deterministic decoration clusters and stable camera/lighting setup so before/after screenshots are comparable.

## Visual direction

The palette is built around deep teal water (`#123b43` / `#1d5960`), desaturated kelp (`#315d4d`), warm sand and stone (`#8f806c` / `#5f6258`), and one restrained coral accent (`#c87862`). The room uses warm charcoal and muted plaster tones so the aquarium reads as a luminous focal plane without relying on neon emission or an overbright transmissive shell.

Material response follows a simple hierarchy:

1. Fish: highest silhouette contrast and controlled cool rim/specular response.
2. Water: saturated volume with subtle surface shimmer and restrained caustics.
3. Tank/glass: thin, low-opacity edge response that frames rather than washes out the fish.
4. Decor: matte, rough, low-poly surfaces with small tonal variation and no competing glow.
5. Room/stand: warm, quiet, broad values that support the tank.

## Architecture and data flow

```text
ART_DIRECTION palette/constants
        |
        +--> LivingRoom / stand materials + key/fill lights
        +--> Tank / water / caustics material defaults
        +--> Decoration family materials + clustered spawn descriptors
        +--> deterministic scene composition
```

The palette remains renderer-independent. WebGL continues to use GLSL materials and WebGPU continues to use the existing TSL node-material variants. No system writes physics transforms; decoration placement is authored at spawn time and Rapier remains authoritative for runtime entities.

## Planned changes

- Add a small art-direction constants module with named palette and lighting values.
- Rework `LivingRoom` into a subdued warm backdrop with a simple wood/charcoal stand, restrained contact planes, and a non-competitive prop silhouette.
- Rebalance `SimulationScene` lights, background, tone-mapping exposure, and environment intensity so the tank supplies the cool focal light while the room supplies warm framing light.
- Tune `Tank`, `Water`, and caustics defaults toward stronger fish silhouettes, less glass wash, and lower additive highlight intensity.
- Replace the current coral/seaweed/rock primitives with a coherent stylized-natural family using shared materials, deliberate faceting, and bounded variation.
- Replace uniform random decoration scatter with deterministic clusters around the tank floor, leaving a clear central swim lane.
- Add focused tests for palette/composition invariants and update browser smoke coverage with screenshot artifacts for the default scene and each quality profile where the existing harness permits.

## Performance and compatibility constraints

- No per-frame geometry/material allocations; all static materials and geometry are memoized or module-scoped.
- No new large binary assets or runtime network dependencies.
- Keep the existing quality feature gates intact. Low quality disables optional effects but retains the same palette, silhouettes, and composition.
- Do not resize WebGPU shadow maps after startup. Do not use `onBeforeCompile` for WebGPU materials.

## Validation

- Unit tests cover palette values, deterministic cluster descriptors, and quality-invariant composition.
- Run format, lint, typecheck, full Vitest suite, production build, bundle budget check, and production-preview browser smoke.
- Capture before/after screenshots at the existing desktop viewport and representative narrow viewport; inspect the tank focal point, fish silhouette contrast, decoration consistency, and console output.

## Out of scope

- Purchasing or importing third-party models.
- Changing fish simulation, physics, spawning counts, or behavior beyond deterministic scene composition needed to keep the school visually distributed.
- Replacing the existing renderer/material architecture or quality system.
