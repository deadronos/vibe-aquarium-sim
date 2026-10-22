# Issue 146: PR 159 review corrections

## Reproduction and fixes

- **Rear caustics:** the opaque backing was at `z=-0.9934`, ahead of the rear overlay at `z=-0.997`. The overlay now derives its position from the backing plus a small visible-side inset. A component test checks the real mesh vertices with depth testing retained.
- **Stress school:** the old 300-fish layout repeated 60 positions after index 239. A three-dimensional grid now scales with the initial school size. Pairwise tests for 1, 30, and 300 fish assert deterministic, in-bounds positions separated by more than the 0.12 collider diameter. Dynamic add-fish behavior is unchanged.
- **Phone framing:** camera fitting accounts for the whole tank and reserves space for the right action rail. Resize scales the current orbit distance around the controls target, preserving user zoom and pan. Tests project every tank corner at desktop, phone, narrow phone, and landscape sizes, plus a zoomed portrait/landscape round trip.
- **WebGPU clarity:** real screenshots exposed a dark right-pane wedge and washed-out fish from transmissive rendering across the merged four-pane shell. The tank now uses thin, front-face-only standard glass at opacity 0.08 with depth writes disabled, and water volume opacity is 0.28. Native and software WebGPU therefore keep fish silhouettes readable while the shell remains visibly glass-like. Component and art-direction tests protect the contrast-sensitive values.
- **Software WebGPU:** adapter metadata is inspected at startup. SwiftShader, llvmpipe, and explicitly software-labelled adapters use a conservative profile: optional effects are disabled, DPR is capped at 1, and WebGPU shadows use a 256px map. This keeps CI's software renderer within a predictable capture budget without falling back to WebGL.

## Browser verification

`tests/e2e/visual-quality.spec.ts` exercises all eight combinations of WebGL/WebGPU and low/medium/high/ultra. Every case requires the requested backend without fallback, all three fish models ready, 30 rendered fish, and subsequent animation frames before capture. It captures both 1200×800 and 390×844 viewports and checks the requested quality remains active, with no page/console errors or HTTP error responses.

Explicit `?quality=low|medium|high|ultra` now locks the selected preset. Normal visits continue to adapt automatically. Use the same query, viewport, initial composition, and readiness conditions for comparisons; this is a human-review artifact suite, not a claim of pixel-identical live physics or shader animation.

```sh
npm run build
npx playwright test --workers=1
```

CI runs the same full Chromium graphics stack for interaction and visual tests. Linux uses a software adapter with WebGPU enabled; the tests still reject application fallback to WebGL. Failure traces, screenshots, and an HTML report including backend/asset/quality diagnostics are uploaded as the `browser-evidence` artifact for 14 days.

## CI timeout investigation

The previous run failed the mobile interaction flow at keyboard navigation and retried a failed screenshot. No consistent functional failure reproduced locally: the original mobile flow passed twice in 36–43 seconds. With the updated scene it still took 37 seconds in the separate Chromium headless shell; running the same flow in full headless Chromium took 2.6 seconds. The suite now consistently uses full Chromium. This identifies a local browser-runtime bottleneck; it does not establish the historical Linux runner's exact root cause. Retained traces make future failures diagnosable.

The first review-revision CI run passed all eleven WebGL/mobile checks but exposed Linux WebGPU device loss immediately after initialization (`Instance dropped in popErrorScope`, followed by buffer-allocation errors). ANGLE's `--use-angle=swiftshader` selects the WebGL adapter, not Dawn's WebGPU adapter. Linux tests now also explicitly select `--use-webgpu-adapter=swiftshader`, the adapter-selection flag documented by [Dawn's test harness](https://dawn.googlesource.com/dawn.git/+/refs/heads/chromium/7690/webgpu-cts/). Adapter details are attached to the report and duplicate errors are collapsed without ignoring failures.

Selecting the adapter alone did not fix the second run. Linux CI now installs the Vulkan loader/Mesa drivers and runs headed Chromium under Xvfb with the complete software-Vulkan configuration (`Vulkan`, `use-angle=vulkan`, `use-vulkan=swiftshader`, `use-webgpu-adapter=swiftshader`, `disable-vulkan-surface`). This follows the [documented Linux render/capture setup](https://github.com/vercel-labs/agent-browser/blob/main/skill-data/core/references/webgpu.md): Linux's headless WebGPU presentation path is not suitable for screenshot verification. Local macOS checks continue using native Metal in headless Chromium.

## Review evidence

Local verification on 2026-09-08: 227 unit/integration tests passed, one existing placeholder skipped; all 15 browser tests passed, including the eight real-backend visual cases. The fresh native WebGPU ultra capture has no right-pane wedge and readable fish at desktop and phone sizes. Formatting, lint, both typechecks, production build, and bundle budgets passed locally.

The full tank and both decoration clusters now fit beside the phone rail. Backend differences remain visible, but the glass treatment no longer obscures the school or introduces pane-scale refraction artifacts. Native WebGPU ultra retains optional effects; software WebGPU intentionally uses the conservative profile described above. These are not pixel-parity assertions.

The CI HTML report contains all sixteen captures and their diagnostics. Representative screenshots are retained alongside this document for review without access to the originating workstation.

![WebGL medium desktop](assets/issue-146/webgl-medium-desktop.png)

![WebGPU ultra desktop](assets/issue-146/webgpu-ultra-desktop.png)

![WebGL medium phone](assets/issue-146/webgl-medium-phone.png)

![WebGPU ultra phone](assets/issue-146/webgpu-ultra-phone.png)
