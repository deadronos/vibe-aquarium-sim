# Tech Context

## Core technologies

- React 19 + TypeScript
- Three.js / @react-three/fiber for rendering (WebGPU with WebGL fallback)
- Three.js TSL (Three Shading Language) for WebGPU node materials
- @react-three/rapier for Rapier physics bindings
- Miniplex + miniplex-react for ECS
- Zustand for UI state and quality settings
- Vite for dev server and bundling

## Useful scripts

- `npm run dev` — start development server (vite)
- `npm run build` — compile TypeScript and build for production
- `npm run preview` — preview production build locally
- `npm run test` — run unit tests (vitest)
- `npm run test:watch` — watch mode for tests
- `npm run lint` — run ESLint across the repo
- `npm run format` — format using Prettier

## Developer notes / constraints

- Keep render-loop allocations to a minimum: create module-level temporary vectors and reuse in `useFrame`.
- Physics is authoritative — systems should apply impulses/velocities to `RigidBody` rather than manually setting transforms.
- Follow the project's ESLint / Prettier rules. Run `npm run lint --max-warnings=0` and `npm run format` as part of development workflow.
- **WebGPU shadow maps**: Do NOT trigger shadow map resizes on WebGPU. Changing `light.shadow.mapSize` + `needsUpdate` causes Three.js to internally dispose the old depth texture, which crashes WebGPU with `"Destroyed texture used in a submit"`. The `AdaptiveQualityManager` skips shadow map resizing when `isWebGPU` is true.
- **WebGPU materials**: Custom materials must use TSL node materials (`MeshBasicNodeMaterial`, `MeshPhysicalNodeMaterial` from `three/webgpu`) on WebGPU, not raw GLSL `shaderMaterial`. Branch on `useVisualQuality().isWebGPU`.

## Bundling notes

- Production builds use Vite/Rollup `manualChunks` to split major dependencies (notably `three` and `rapier`).
- The simulation scene is lazy-loaded to defer physics (Rapier) startup cost until simulation start.
- React StrictMode is disabled in `src/main.tsx` to avoid dev-only WebGL context loss from R3F double-mount behavior.
- Note: Production environments (CDNs, GitHub Pages) can evaluate JS module chunks in ways that expose module initialization ordering bugs when critical dependencies are split into tiny chunks. When that happens merge critical runtime dependencies into a single vendor chunk or add deployment smoke tests that validate the live site for console errors.
