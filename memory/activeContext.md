# Active Context

## Current focus

- Branch: `claude/living-room-rebuild` — the app was rebuilt from scratch (2026-10-22).
- The previous ECS + Rapier + WebGPU architecture (and the design/task history in this memory
  bank) is superseded. Older files in `memory/` describe that codebase and are kept for history.

## The rebuild

- Real-world scale (metres) living room: window with time-of-day sky, curtains, sofa, coffee
  table, rug, floor lamp, fig plant, bookshelf, wall art, walnut sideboard.
- Rimless planted tank: sloped sand, Iwagumi rocks, driftwood, swaying plants, LED fixture,
  lily pipes, bubbles, light shafts, depth absorption + caustics shader patch.
- Pure-TS boids school (`src/sim/school.ts`) with food seeking and day/night activity.
- Clock modes: live local time, 6-minute day cycle, manual slider.
- Viewpoints: Sofa, Tank, Up close, Room, Follow a fish. Procedural ambient audio.

## Next ideas

- Blender-baked room (lightmaps) replacing the procedural furniture.
- A cat that wanders up to the glass; fish react.
- Tap-the-glass startle; more species; per-fish names/inspection.
