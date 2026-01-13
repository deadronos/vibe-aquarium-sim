# DES015 - Tank Visual Materials & Caustics

**Status:** Completed (2026-01-13)

## Summary

This document records the chosen visual parameters for the tank glass and the caustics overlay shader. These values were taken directly from the current implementation in `src/components/Tank.tsx` and `src/shaders/causticsShader` (where the overlay shader source lives). Recording them here ensures design continuity and makes tuning decisions explicit.

## Files

- `src/components/Tank.tsx` — MeshTransmissionMaterial usage and `TankCausticsOverlay` implementation
- `src/performance/qualityPresets.ts` — quality presets for `tankTransmissionResolution` and `tankTransmissionSamples`
- `src/shaders/causticsShader.ts` — caustics vertex/fragment shader sources

## Tank "Glass" Material (MeshTransmissionMaterial)

These are the current runtime defaults (copied verbatim from code on 2026-01-13):

- color: `#ffffff`
- samples: `transmissionSamples` (driven by quality presets, default: see presets below)
- resolution: `transmissionResolution` (driven by quality presets)
- thickness: `0.2`
- roughness: `0.01`
- chromaticAberration: `0.06`
- anisotropy: `0.1`
- ior: `1.5`
- transmission: `1`
- transparent: `true`
- opacity: `0.4`
- envMapIntensity: `0.1`
- clearcoat: `0.8`
- attenuationDistance: `0.01`
- attenuationColor: `#95abf6`
- backside: `true`
- toneMapped: `true`

**Rationale:** These parameters produce a subtle glass look with noticeable but not overpowering color attenuation (via `attenuationColor` and `attenuationDistance`), strong clarity (high transmission + low roughness), and a soft clearcoat for highlights. A moderate `opacity` (0.4) keeps the tank visually distinct while allowing interior elements to show through.

## Quality Presets Impact

The MeshTransmissionMaterial's `samples` and `resolution` are driven by the `useQualityStore` settings. Current presets (from `src/performance/qualityPresets.ts`) are:

- low: resolution 512, samples 2
- medium: resolution 768, samples 4
- high: resolution 1024, samples 6
- ultra: resolution 1536, samples 8

Documenting the relationship between quality presets and tank transmission settings ensures the visual fidelity scales predictably with user choice and device capability.

## Tank Caustics Overlay Uniforms (TankCausticsOverlay)

The caustics overlay uses a simple shader with these default uniforms (from `Tank.tsx`):

- time: evolves via `useFrame` (value set to `state.clock.elapsedTime`)
- intensity: `0.85`
- scale: `1.35`
- speed: `0.45`
- color: `#aaddff` (a pastel cyan to match water tone)

**Rationale:** The intensity and color were chosen to give a soft, stylized caustics look that reads on most displays without overwhelming the scene. The scale & speed balance gives believable motion without aliasing at low sample counts.

## Acceptance Criteria

- The Tank visual material uses the documented defaults unless explicitly tuned in a dedicated design iteration.
- `MeshTransmissionMaterial` resolution & samples are driven by `qualityPresets` and scale appropriately between `low` and `ultra`.
- Caustics overlay uniforms exist and produce a stable, performant visual on mainstream hardware.

## Suggested Follow-ups

- Add a unit test that asserts the Tank mesh material has the expected default properties (opacity, ior, attenuationColor, etc.).
- Add a short note in the UI tuning guide (once runtime UI exists) exposing `opacity`, `attenuationColor`, and `clearcoat` as user-adjustable parameters for experimentation.

**Author:** Automated backfill (recorded 2026-01-13)
