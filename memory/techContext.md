# Tech Context

## Core technologies

- React 19 + TypeScript (strict, `erasableSyntaxOnly`: no parameter properties or enums)
- Three.js r184 with `WebGLRenderer`
- @react-three/fiber 9, @react-three/drei 10 (CameraControls, Environment/Lightformer,
  RoundedBox, useGLTF with meshopt, PerformanceMonitor)
- @react-three/postprocessing / postprocessing (DepthOfField, Bloom, Vignette, ToneMapping AgX)
- zustand for UI state
- Vite 8 with the React Compiler babel preset
- Vitest (node environment) for unit tests; Playwright for the browser smoke test

## Useful scripts

- `npm run dev`: dev server
- `npm run build`: typecheck the app and build to `dist/`
- `npm run test` / `npm run test:coverage`: unit tests
- `npm run test:smoke`: Playwright smoke test against `dist/` (run `npm run build` first)
- `npm run typecheck`: app + test typecheck
- `npm run lint -- --max-warnings=0`, `npm run format`, `npm run format:check`
- `npm run check:bundle`: JS gzip and fish-model byte budgets (after a build)
- `npm run report:bundle`: regenerate `docs/performance/asset-transfer.md`
- `npm run assets:optimize` / `npm run assets:verify`: re-encode and check the fish GLBs from
  `assets/source/fish/`

## Assets

- Fish: three meshopt-compressed GLBs in `public/` (clownfish, blue tang, angelfish). They are
  quantised and have no normals; `FishView` bakes the node transform, welds vertices, normalises
  to unit length along +Z (head forward) and computes normals.
- Everything else is procedural.

## CI / deployment

- `ci.yml` (PRs and `main`): format, lint, typecheck, unit tests, coverage, build, bundle budget,
  and the Playwright smoke test under Xvfb with software Vulkan (SwiftShader).
- `deploy-pages.yml` runs on `v*` tags (or manually): it checks that the tag is on `main`, runs
  the smoke test against the build, then deploys `dist/` to GitHub Pages.
- Software GL on CI compiles shaders slowly; the smoke test boots with `?quality=lite` and allows
  90 s for the first frames.
