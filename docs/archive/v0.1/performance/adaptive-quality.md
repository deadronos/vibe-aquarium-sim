# Adaptive quality

The aquarium starts with a quality profile selected from the device DPR and
the active renderer. The profile is backend-aware: WebGL can resize shadow maps
after a transition, while WebGPU keeps the initial shadow texture size for the
lifetime of the scene.

## Optional-cost profiles

| Quality | WebGL shadow | WebGPU shadow | Caustics | Fish rim/SSS | Spot shadows | WebGPU tank transmission |
| ------- | -----------: | ------------: | -------- | ------------ | ------------ | ------------------------ |
| low     |          512 |           256 | off      | off          | off          | off                      |
| medium  |          768 |           512 | on       | on           | on           | on                       |
| high    |         1024 |           768 | on       | on           | on           | on                       |
| ultra   |         1536 |          1024 | on       | on           | on           | on                       |

The low profile keeps the tank mounted but uses the standard non-transmissive
material on WebGPU. This avoids allocating a transmission texture while a
quality transition is in flight. WebGL keeps its existing standard glass path.

## Adaptive transitions

The manager uses an EMA of frame FPS with the existing hysteresis and cooldown:

- sustained FPS below 52 degrades one level after two sampling intervals;
- sustained FPS above 58 upgrades one level after four intervals;
- a 2.5-second cooldown prevents oscillation.

When the Debug HUD is visible, transitions are recorded in
`window.__vibe_debug.qualityTransitions` (at most 32 entries). Each entry has
`from`, `to`, `backend`, `ema`, `reason`, and `time`. The reasons are
`low-fps`, `high-fps`, and `device-clamp`. No transition records or frame-loop
timing calls are created when the collector is absent.

## Repeatable stress check

Run the preview smoke suite with the explicit stress URL:

```text
http://127.0.0.1:5175/vibe-aquarium-sim/index.html?quality=low&stress=quality
```

`stress=quality` starts 300 fish instead of the normal 30 and exposes
`window.__vibe_qualityStatus`. The browser smoke test verifies the low-cost
flags, bounded school, canvas startup, and absence of page errors/404s. The
unit harness separately drives synthetic 30 FPS samples down to low quality
and 60 FPS samples back toward medium, asserting cooldown and telemetry
behavior without depending on host GPU timing.
