# Phase 1 Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the aquarium deterministic across display refresh rates, keep WebGPU from being an unsafe default, and add CI plus real integration/browser coverage for these paths.

**Architecture:** Keep Rapier as the authoritative integrator. Fish controls are consumed once from a fixed physics-step callback; render frames only read physics state and update visuals. Renderer selection becomes an explicit, testable policy with a safe WebGL fallback. CI runs the existing checks plus production-preview browser smoke tests.

**Tech Stack:** React 19, React Three Fiber, @react-three/rapier, Three.js WebGPU/WebGL, Miniplex ECS, Vitest, Playwright Test, GitHub Actions.

---

### Task 1: Fixed-step force consumption

**Files:**

- Modify: `src/components/Fish.tsx` to apply queued forces once in `useBeforePhysicsStep` and only synchronize state in `useFrame`.
- Create: `src/components/fishPhysicsStep.ts` for the fixed-step control update.
- Modify: `src/utils/physicsHelpers.ts` to make force consumption explicit and clear steering after consumption.
- Test: `tests/physicsHelpers.test.ts` for one-shot force consumption and frame-rate-independent integration.
- Test: `tests/fishPhysicsStep.test.ts` and `tests/components/Fish.physics-hook.test.tsx` for physics-state precedence and hook wiring.

- [ ] **Step 1: Write the failing helper tests**

  Add tests that create an entity with a steering force and external force, consume the force twice, and assert the second call does not change velocity. Add a schedule test that integrates the same force for 30, 60, and 120 render frames while advancing exactly 60 fixed ticks and asserts equal final velocity.

- [ ] **Step 2: Run the focused tests and verify the expected failure**

  Run:

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase1.localstorage' npm run test -- tests/physicsHelpers.test.ts tests/components/Fish.test.ts
  ```

  Expected: the new one-shot and refresh-rate tests fail because steering is currently retained and the production Fish component integrates during render frames.

- [ ] **Step 3: Implement a one-shot force-consumption helper**

  Change the helper contract so it applies both queued vectors using the supplied fixed delta, then clears both vectors. Keep the reusable module-level temporaries and do not allocate in the helper.

- [ ] **Step 4: Move production Fish force application before physics**

  Import `useBeforePhysicsStep` from `@react-three/rapier`. Register one callback per Fish that reads the rigid body velocity, applies the queued forces exactly once, clamps the target velocity, writes it to Rapier, and handles boundary correction. Leave the existing `useFrame` callback responsible only for reading the post-step translation/velocity back into ECS and debug sampling.

- [ ] **Step 5: Run focused tests and refactor only after green**

  Re-run the focused command. Then remove obsolete render-frame force code and update comments to describe the before-step/after-step source-of-truth loop.

- [ ] **Step 6: Run the full unit suite**

  Run:

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase1.localstorage' npm run test
  ```

  Expected: all existing tests plus the new fixed-step tests pass.

### Task 2: Safe renderer policy and WebGPU fallback

**Files:**

- Create: `src/utils/rendererPolicy.ts` with a pure renderer preference parser and fallback decision.
- Modify: `src/SimulationScene.tsx` to use the policy, catch WebGPU import/init failures, and expose the selected renderer in a stable diagnostic field.
- Test: `tests/rendererPolicy.test.ts` covering default WebGL, explicit WebGPU opt-in, invalid preferences, and fallback.

- [ ] **Step 1: Write the failing renderer-policy tests**

  Specify that no preference returns WebGL, `?renderer=webgpu` requests WebGPU, `?renderer=webgl` requests WebGL, and a failed WebGPU attempt resolves to WebGL. Keep parsing independent of browser globals so the tests are deterministic.

- [ ] **Step 2: Run the focused tests and verify they fail**

  Run:

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase1.localstorage' npm run test -- tests/rendererPolicy.test.ts tests/SimulationScene.test.tsx
  ```

- [ ] **Step 3: Implement the minimal policy**

  Add typed `RendererKind` and a parser that accepts only explicit `webgpu`/`webgl` query or storage values. Default to WebGL for end-user sessions while preserving an explicit WebGPU diagnostic opt-in.

- [ ] **Step 4: Integrate initialization and fallback**

  Keep `supportsWebGPU()` as the capability check, but only attempt WebGPU when the policy requests it. Wrap dynamic import and `renderer.init()` in a `try/catch`; on failure set WebGL configuration and continue rendering. Publish a stable `window.__vibe_rendererStatus` object only when debug mode is enabled.

- [ ] **Step 5: Add deterministic browser smoke coverage**

  Add a smoke script that starts a production preview, opens the app, waits for 30 fish, asserts no console errors, asserts the fish counter is 30, and checks that the renderer status is either WebGL or WebGPU. Run it once with default policy and once with `?renderer=webgpu` when the browser exposes WebGPU.

- [ ] **Step 6: Run focused tests and the local smoke script**

  Confirm the default path is WebGL, explicit WebGPU failures fall back, and both paths render the HUD and fish count.

### Task 3: PR CI and production-preview validation

**Files:**

- Create: `.github/workflows/ci.yml` for pull requests and pushes to `main`.
- Create: `playwright.config.ts` and `tests/e2e/smoke.spec.ts` for production-preview browser validation.
- Create: `scripts/check-bundle-budget.mjs` for JavaScript/model asset budgets.
- Modify: `package.json` to expose the smoke command and avoid forced installs in CI.
- Modify: `vitest.config.ts` to keep Playwright specs out of the Vitest suite and report all source files in coverage.
- Modify: `.gitignore` to exclude Playwright artifacts.

- [ ] **Step 1: Write the smoke command contract**

  Define the command as `npm run test:smoke`, with the script starting or consuming a preview URL, waiting for the app shell, asserting the fish count, collecting console errors, and failing on asset 404s.

- [ ] **Step 2: Run the command before implementation and verify it fails clearly**

  Run:

  ```bash
  npm run test:smoke
  ```

  Expected: the command is currently unavailable, proving the new CI entry point is not accidentally testing an existing command.

- [ ] **Step 3: Implement the smoke script and package script**

  Use the repository-approved Playwright CLI wrapper or an explicitly declared Playwright dependency. Keep artifacts under `output/playwright/` and return a non-zero exit code for console errors, failed navigation, missing fish, or 404 responses.

- [ ] **Step 4: Add the CI workflow**

  Run `npm ci`, format check, lint with zero warnings, typecheck, unit tests, build, and the production-preview smoke. Add concurrency cancellation and make release deployment depend on successful validation.

- [ ] **Step 5: Configure meaningful coverage**

  Enable V8 `all` coverage for `src` while excluding generated assets and test-only adapters. Confirm the report includes the real Fish and SimulationScene modules rather than only transitively imported files.

- [ ] **Step 6: Run the complete validation matrix**

  Run:

  ```bash
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase1.localstorage' npm run format:check
  npm run lint -- --max-warnings=0
  npm run typecheck
  NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase1.localstorage' npm run test
  npm run build
  npm run test:smoke
  git diff --check
  ```

  Record test counts, bundle output, browser renderer status, and any remaining warnings in the pull request.

### Task 4: Handoff

**Files:**

- Modify: `memory/activeContext.md` and `memory/progress.md` with Phase 1 status and any deferred risks.

- [ ] **Step 1: Update memory-bank status**

  Record the branch, completed issue numbers, validation results, and any intentionally deferred visual-parity work.

- [ ] **Step 2: Review the diff and issue links**

  Confirm every Phase 1 acceptance criterion maps to a test or browser check, then prepare a PR body linking #140, #141, #148, and #150.

- [ ] **Step 3: Request review before merge**

  Run the code-review workflow against the branch diff. Resolve critical/important findings before asking for merge approval.
