# Adaptive quality design

## Goal

Make quality selection backend-aware and effective at the low tier without
disposing resources that a WebGPU command buffer may still reference. The
adaptive manager should lower expensive visual work when frame time is poor,
recover toward the target when headroom returns, and expose why transitions
occurred.

## Scope

This design addresses issue #143. It covers the four shipped quality levels,
WebGL/WebGPU profile differences, initial shadow-map sizing, safe transitions,
transition telemetry, and deterministic stress/recovery coverage. It does not
replace the renderer selection policy, change the fish simulation, or promise
visual parity for the still-open #140 work.

## Profile model

`qualityPresets.ts` remains the pure source of preset values. A new
`qualityProfile.ts` resolver accepts `(level, backend)` and returns a
`QualityProfile` containing the existing numeric settings plus explicit cost
flags:

- `causticsEnabled`
- `fishRimLightingEnabled`
- `fishSubsurfaceScatteringEnabled`
- `spotLightShadowsEnabled`
- `tankTransmissionEnabled`
- `tankTransmissionDispersionEnabled`
- `shadowMapSize`

The low profile disables all optional high-cost effects on both backends. WebGL
and WebGPU may use different numeric values when a backend has a different
cost (for example, WebGPU starts with the profile's shadow size but never
resizes it after initialization). Existing callers that only need a boolean
flag continue to receive those values through `VisualQualityProvider`.

## Scene integration

`SimulationScene` derives the initial profile from the current quality level
and selected renderer before mounting the lights. The initial directional and
spot shadow map sizes come from that profile rather than a hard-coded `1024`.
Lighting is rendered through a small context-aware scene component so low
quality can disable the spot-light shadow without mutating a live WebGPU
texture. `AdaptiveQualityManager` continues to resize WebGL shadows only after
a quality transition; WebGPU shadows remain at their initial size.

The tank keeps its material mounted across quality changes. On WebGPU,
low-quality glass uses the standard non-transmissive path while higher tiers
retain transmission; this avoids creating a new transmission texture during a
transition. On WebGL, the existing standard glass path remains available.
Caustics and fish lighting consume the resolved profile flags, and the fish
material enhancement is skipped entirely when both optional lighting features
are disabled.

## Adaptive transitions and telemetry

The existing hysteresis and cooldown remain the transition policy: sustained
low FPS degrades one level, sustained high FPS upgrades one level, and a
cooldown prevents oscillation. Each transition records a bounded diagnostic
entry containing the previous level, next level, backend, EMA FPS, and reason
(`low-fps`, `high-fps`, or `device-clamp`). Telemetry is opt-in through the
existing `window.__vibe_debug` collector; the production frame loop does not
allocate or record entries when diagnostics are disabled.

## Stress and validation

- Pure profile tests assert low-tier cost flags and backend-specific shadow
  values.
- Component tests assert low-quality scene output disables optional costs and
  that the initial shadow props use the resolved size.
- Transition tests assert hysteresis, cooldown, bounded telemetry, and no
  WebGPU shadow resize/disposal calls. A deterministic frame-sequence harness
  drives the controller down under sustained 30 FPS samples and back toward
  the target under sustained 60 FPS samples.
- A browser smoke path accepts `?quality=low&stress=quality`, spawns a bounded
  larger school, and exposes the resolved low-cost status so the real scene is
  checked without relying on nondeterministic host GPU timings.

The existing format, lint, typecheck, unit, build, bundle-budget, and preview
smoke checks remain required.
