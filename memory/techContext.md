# Tech Context

## Core technologies

- React 19 + TypeScript
- Three.js / @react-three/fiber for rendering
- @react-three/rapier for Rapier physics bindings
- Miniplex + miniplex-react for ECS
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

## Bundling notes

- Production builds use Vite/Rollup `manualChunks` to split major dependencies (notably `three` and `rapier`).
- The simulation scene is lazy-loaded to defer physics (Rapier) startup cost until simulation start.
- React StrictMode is disabled in `src/main.tsx` to avoid dev-only WebGL context loss from R3F double-mount behavior.
