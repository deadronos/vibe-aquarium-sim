# Vibe Aquarium Sim

A cozy living-room aquarium you can sit and watch. A planted, rimless tank sits on a walnut
sideboard. The room follows your local time: sunlight crosses the floor through the window, the
lamp comes on in the evening, and the tank light dims to moonlight at night. A school of
clownfish, blue tangs and angelfish swims inside.

Fish models were generated with experimental Copilot 3D
(https://copilot.microsoft.com/labs/experiments/3d-generations). Everything else is procedural:
no textures or room models are downloaded.

Live demo: [deadronos.github.io/vibe-aquarium-sim](https://deadronos.github.io/vibe-aquarium-sim/)

![The living room with the aquarium in the afternoon](./docs/living-room.jpg)

## What you can do

- **Watch**: switch between Sofa, Tank, Up close, Room and Follow a fish (keys 1–5).
- **Feed**: click the water, press F, or use Feed. Hungry fish dart for the flakes.
- **Time**: follow your local clock, run a six-minute day cycle, or drag the slider.
- **Listen**: turn on the procedural filter hum and bubbles (M).
- **Hide the UI**: it fades on its own when you stop moving the mouse, or press H.

## How it works

- `src/sim/`: plain TypeScript boids school, food and time-of-day lighting model, unit-tested.
- `src/scene/`: React Three Fiber room, furniture, tank and instanced fish. Under-water
  materials get depth absorption and caustics from a shared shader patch.
- See [AGENTS.md](./AGENTS.md) and [docs/agents](./docs/agents) for the details.

Tech stack: React 19, TypeScript, Vite, Three.js, @react-three/fiber, drei, postprocessing,
zustand.

Getting started

Prerequisites

- Node.js 22 (the version CI uses; Vite 8 needs 20.19+ or 22.12+)

Install

```bash
npm ci
```

Run locally

```bash
npm run dev
```

Build

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

Tests & formatting

```bash
npm run test        # unit tests (Vitest)
npm run typecheck   # app + test typecheck
npm run lint -- --max-warnings=0
npm run format      # Prettier
npm run build && npm run test:smoke   # boot the production build in Chromium
```

Development notes

- Avoid allocating Vector3/Matrix objects inside render loops; reuse module-level scratch objects.
- Keep simulation logic in `src/sim/` (no Three.js); the scene reads it each frame.
- Start with `src/config/scene.ts` (dimensions), `src/sim/school.ts` (fish behaviour) and
  `src/scene/Experience.tsx` (scene composition).

Releases & deployment

- `ci.yml` runs on every PR and on `main`: format, lint, typecheck, unit tests, coverage, build,
  bundle budget, and the Playwright smoke test (Xvfb + software Vulkan).
- `deploy-pages.yml` runs when a `v*` tag is pushed (or manually). It checks that the tagged
  commit is on `main`, boots the built app with the smoke test, then deploys `dist/` to
  [GitHub Pages](https://deadronos.github.io/vibe-aquarium-sim/). To release, tag the tip of
  `main` (for example `git tag -a v0.2.4 -m "…" && git push origin v0.2.4`). Tags are the source
  of truth for the version; bump `package.json` to match in the release PR (see
  [docs/agents/workflow.md](./docs/agents/workflow.md#-releases)).
- Vite's `base` is `/vibe-aquarium-sim/` for production builds (see `vite.config.ts`).

Tips

- Add `?quality=lite` to the URL to start without post-processing on slow machines.
- `?quality=medium` starts on High without depth of field. On High, the room steps down to that
  and then Lite when the frame rate drops, and back up once it recovers.
- Keyboard: 1–5 viewpoints, F feed, M sound, H hide the HUD.

Contributing

- Start with [AGENTS.md](./AGENTS.md) and [docs/](./docs/README.md); the memory bank in
  `memory/` holds the project brief, patterns and history.
- Keep simulation logic in `src/sim/` with tests, and avoid allocations in render loops.
- Documents under `docs/archive/v0.1/` describe the pre-rebuild codebase and are historical only.

License

- [MIT](./LICENSE).
