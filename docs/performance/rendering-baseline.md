# Rendering performance baseline

This benchmark is evidence for quality-policy decisions, not a portable frame-rate gate.
Results must be interpreted with the named browser, OS, GPU/backend, viewport and quality mode.

## Reproduce

```bash
npm run bench:render
```

The command builds `dist`, starts the project-Pages preview server, opens the app at a phone
viewport, waits for readiness plus ten seconds of adaptive-quality settling, resets the sampler,
and records up to 300 recent frame samples for the effective High, Medium or Lite level. Set
environment variables to vary the run:

```bash
BENCHMARK_WIDTH=1024 \
BENCHMARK_HEIGHT=768 \
BENCHMARK_QUALITIES=high,medium,low \
npm run bench:render
```

Set `BENCHMARK_HEADLESS=false` when a local display/GPU is available. This keeps the same
metric hook and viewport but avoids the software renderer used by headless Chromium.

When a server is already running, set `BENCHMARK_URL` to its project-pages URL. On Linux the
benchmark uses the same SwiftShader Vulkan route as the smoke workflow.

## Metrics

The opt-in `?profile=1` hook reports:

- effective quality after adaptive policy
- Lite/High shadow-map size
- average, minimum, maximum and p95 frame time
- average FPS
- draw calls and triangles from the most recent renderer frame

Profiling allocates a fixed 300-entry sampler and is mounted only when `profile` is present.
Normal rendering does not mount it.

## Quality policy

| Quality | DPR       | Post-processing                               | Shadow map |
| ------- | --------- | --------------------------------------------- | ---------- |
| High    | up to 1.5 | Depth of field, bloom, vignette, tone mapping | 2048×2048  |
| Medium  | up to 1.5 | Bloom, vignette, tone mapping                 | 2048×2048  |
| Lite    | 1         | None                                          | 1024×1024  |

Lite keeps the same on-demand shadow update rule as High/Medium so contact grounding remains
readable, but reduces the shadow texture memory and raster cost by 75%.

The post stack renders without compositor multisampling. The main renderer remains
antialiased, while the offscreen stack avoids the unsupported multisampled depth/stencil blit
that produced repeated `GL_INVALID_OPERATION` warnings on SwiftShader.

## Baseline

### 2026-11-19 — Chromium phone viewport on the local development machine

The browser reported its renderer string through `WEBGL_debug_renderer_info`. These numbers are a
single warm-run sample, not a cross-device guarantee.

| Requested | Effective | Avg frame | p95 frame |   FPS | Draw calls | Triangles | Shadow |
| --------- | --------- | --------: | --------: | ----: | ---------: | --------: | ------ |
| High      | Low       |   95.8 ms |   97.4 ms | 10.44 |        102 |    81,964 | 1024   |
| Medium    | Low       |   98.6 ms |   95.2 ms | 10.14 |        102 |    81,964 | 1024   |
| Low       | Low       |   92.6 ms |   95.6 ms | 10.79 |        102 |    81,964 | 1024   |

Environment: Headless Chrome 151.0.7922.34 on `MacIntel`, ANGLE Vulkan with
`SwiftShader Device (LLVM 10.0.0)`. Viewport: 390×844, DPR 1.

The automatic monitor stepped down both High and Medium to Lite before the stabilized sample
window. The rows therefore compare the same effective Lite level after different requested
paths. The headed post-processing draw count below is the final compositor pass, not the full
scene plus compositor.

This evidence supports the measured 1024×1024 Lite shadow map: Lite retained contact grounding
and was faster than the post-processed modes in the same environment. Re-run this command on the
intended low-power physical device and append that environment's row set before making a
device-specific threshold change.

### 2026-11-19 — headed Chromium on Apple M4

At 1024×768, the same High profile completed with an effective High quality of 60.0 FPS,
16.7 ms average frame time and 17.4 ms p95. The `WEBGL_debug_renderer_info` string was
`ANGLE Metal Renderer: Apple M4`. The run produced no repeated
`GL_INVALID_OPERATION: glBlitFramebuffer` warning. This compares the intended local GPU path
with the separate SwiftShader baseline above rather than treating headless metrics as
representative hardware performance.
