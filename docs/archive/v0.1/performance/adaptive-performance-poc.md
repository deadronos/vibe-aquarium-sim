# Adaptive Performance (PoC) — Instance Update & Scheduler Telemetry

This document describes a small opt-in adaptive performance mechanism added as a PoC to improve frame stability under heavy simulation load.

What it does

- Adaptive instance updates: throttles `InstancedMesh.instanceMatrix.needsUpdate` frequency based on a lightweight EMA of `FishRenderSystem` frame time. This reduces GL buffer update bursts when frame time increases.

- Adaptive scheduler telemetry: measures fixed-step callback time when enabled.
  Production Rapier pacing owns the fixed-step boundary and invokes
  `FixedStepScheduler.step()` once per physics step, so the old max-sub-step
  throttling policy is intentionally not applied to production callbacks.

How to enable

- These features are opt-in and controlled by Visual Quality flags:
  - `adaptiveInstanceUpdatesEnabled` (default: false)

  - `adaptiveSchedulerEnabled` (default: false; enables scheduler timing telemetry)

- Ways to enable:
  - Use the `useQualityStore` to set `settings` (via `setLevel` or `setState`) to a preset that has the flags enabled.

  - Set a per-session override via `useGameStore`'s `visualQualityOverrides` (for quick testing).

  - For quick runtime toggles during debugging, set `window.__vibe_poc_enabled = true/false` (the VisualQuality flag must also be enabled to take effect).

Testing & Observability

- The Debug HUD shows live EMA, update frequency, and scheduler EMA.

- The debug collector is available at `window.__vibe_debug` and can be downloaded via the Debug HUD "Download trace" button.

Notes

- This PoC is intentionally conservative; defaults are OFF. If enabled, use the
  scheduler EMA as evidence for future pacing work; do not reintroduce a
  render-rate callback budget into the Rapier-owned fixed-step path.

- Recommended: enable these features in scenarios with heavy entity counts or on mobile/low-end GPUs as an experimental mitigation.
