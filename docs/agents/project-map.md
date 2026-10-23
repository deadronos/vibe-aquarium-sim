# Project Map

```
src/
  App.tsx               Canvas + HUD
  config/scene.ts       Room, cabinet, tank dimensions (metres), substrate shape, palette
  sim/                  Pure simulation: school, food, species, aquascape, timeOfDay, random
  state/store.ts        zustand: clock mode, viewpoint, quality, sound, feed requests, load errors
  scene/
    Experience.tsx      Scene composition
    ErrorBoundary.tsx   Catches render errors and reports them to the store
    ContextWatcher.tsx  WebGL context lost/restored → store
    DaylightDriver.tsx  Clock → eased `daylight` state + water uniforms
    daylight.ts         Shared mutable lighting state
    Lights.tsx          Sun (shadowed), window skylight, lamp, reflection environment
    CameraRig.tsx       Viewpoints and fish follow-cam
    shots.ts            Viewpoint shots and the cabinet each one keeps on screen
    framing.ts          Aspect-aware framing: dolly back, then widen FOV, on narrow screens
    Effects.tsx         Depth of field, bloom, vignette, tone mapping
    focus.ts            Focus point shared by camera and DoF
    textures.ts         Procedural canvas textures (wood, plaster, fabric, rug, sand, bark, art)
    room/Room.tsx       Walls, window, sky, curtains, baseboards
    room/Furniture.tsx  Cabinet, sofa, coffee table, rug, floor lamp, plant, bookshelf, art
    tank/Tank.tsx       Glass, water surface, LED fixture and spots, pipes, click-to-feed
    tank/Aquascape.tsx  Substrate, rocks, driftwood, plants
    tank/WaterFx.tsx    Bubbles, suspended particles, light shafts
    tank/underwater.ts  Water uniforms and the `makeUnderwater` material patch
    fish/FishLoader.tsx Error boundary, download timeout and Retry remount around FishView
    fish/FishView.tsx   GLB loading, instanced fish and food, fixed-step sim loop
    fish/assets.ts      Fish GLB URLs
    fish/simulation.ts  The running school + food pool
  ui/Hud.tsx            Clock, viewpoints, feed/sound/quality controls, keyboard shortcuts
  audio/ambience.ts     Procedural WebAudio filter hum, trickle and bubbles
public/                 Fish GLBs (clownfish, blue tang, angelfish)
tests/                  Vitest unit tests for src/sim and the store; tests/e2e Playwright smoke test + load-error spec
```
