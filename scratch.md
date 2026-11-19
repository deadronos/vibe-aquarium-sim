# Suggested Next Issue Batches

This sequence prioritizes user-visible correctness and reliable verification before larger visual or
simulation changes. Each batch should be treated as a small reviewable unit; do not block independent
sub-batches when parallel contributors are available.

## Batch 1: Restore interaction and accessibility

**Goal:** Make every primary control dependable for mouse, touch, keyboard, and assistive
technology.

### Issues

- [ ] #235 — Make hidden and idle HUD controls non-focusable and touch-actionable
- [ ] #229 — Describe the aquarium canvas and complete radio-group keyboard behavior

**Why this batch:** These are the highest-impact user-facing gaps from the review. They affect
the same HUD interaction model and should be fixed together so pointer, focus, idle, and
screen-reader behavior remain consistent.

**Suggested output:**

- One focused PR for hidden/idle HUD focus and touch behavior
- One small follow-up PR for canvas description and radio semantics, or combine if the resulting
  diff remains easy to review
- Component tests plus Playwright coverage at desktop and mobile widths

**Do not include:** Visual-only HUD redesigns or new controls.

## Batch 2: Strengthen the verification baseline

**Goal:** Make the deploy gate prove that the aquarium renders and responds, rather than merely
loading.

### Issues

- [ ] #232 — Make High-quality smoke tests prove the scene actually renders
- [ ] #231 — Reconcile architecture, simulation ownership, and runtime settings

**Why this batch:** #232 should land before deeper rendering work so regressions can be measured.
#231 is intentionally small and can run in parallel, removing misleading ownership and quality
guidance before more contributors work from it.

**Suggested output:**

- A render-readiness signal used by the smoke suite
- Assertions that frames continue after startup and representative interactions
- A meaningful observable assertion for feeding
- Updated current architecture and memory-bank documentation

**Dependency note:** Complete #232 before relying on the smoke suite for #234 or #236.

## Batch 3: Remove hidden background work and establish performance data

**Goal:** Stop unnecessary work and replace anecdotal performance observations with repeatable
measurements.

### Issues

- [x] #230 — Suspend or stop the WebAudio graph when sound is muted
- [x] #236 — Benchmark and reduce Lite rendering cost on mobile

**Why this batch:** #230 is a contained lifecycle fix. #236 provides the evidence needed for later
quality-policy changes and can proceed without changing the visual design first.

**Suggested output:**

- Tests for repeated mute/unmute cycles, AudioContext state, timers, and node lifecycle
- A repeatable performance protocol covering physical mobile/low-power hardware and CI software
  rendering
- Recorded baselines for FPS, frame-time distribution, draw calls, and shadow cost
- A narrow Lite-policy change only if the benchmark proves a benefit

## Batch 4: Stabilize High-quality rendering

**Goal:** Determine the source and impact of the High-mode depth/stencil warnings, then harden the
postprocessing path without hiding failures.

### Issues

- [x] #234 — Investigate High-mode WebGL depth-stencil errors and fallback behavior

**Prerequisites:**

- #232 for stronger rendered-frame failure detection
- #236 for a clean baseline and reproducible hardware/software test matrix

**Suggested output:**

- Reproduction notes by renderer, GPU class, browser, quality mode, and post-stack state
- A root-cause fix if the issue reproduces, or documented evidence that it is limited to unsupported
  or software-only configurations
- An understandable automatic fallback/notice without silent retry loops
- A regression test or guarded smoke assertion appropriate to the supported renderers

## Batch 5: Improve simulation-to-visual fidelity

**Goal:** Ensure fish movement respects the geometry players can see.

### Issues

- [x] #233 — Prevent fish from crossing visible driftwood branches

**Why this batch comes later:** The fix touches simulation obstacle representation and aquascape
visual geometry. It should build on the stronger test foundation from Batch 2 and remain isolated
from renderer-policy work.

**Suggested output:**

- A precomputed, Three.js-free obstacle representation under `src/sim/`
- Deterministic tests for normal swimming, feeding dashes, and startle movement
- Tank and Up close viewpoint verification
- No new allocations in simulation steps

## After the review findings

Once #229-#236 are complete, resume the existing visual roadmap:

1. [x] #189 — Contact shadows / AO and fish grounding
2. #192 — Material detail for rocks, plants, and water
3. [x] #190 — More convincing room reflections
4. #191 — A livelier time-aware window
5. #193 — Sofa viewpoint composition

Keep the remaining visual issues grouped so art-direction changes can be reviewed together without
conflicting with the simulation or quality-policy batches.

## Ordering summary

1. **Correct interaction:** #235 + #229
2. **Strengthen the test/documentation baseline:** #232 + #231
3. **Remove waste and measure Lite:** #230 + #236
4. **Harden High rendering:** #234
5. **Fix visible simulation intersections:** #233
6. **Resume visual polish:** #189-#193

Avoid combining the High-rendering, simulation-collision, and visual-polish work into one broad
batch; failures would be difficult to isolate and each area needs a different verification method.
