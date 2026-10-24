# Project Map

```
src/
  App.tsx               Canvas + HUD
  config/scene.ts       Room, cabinet, tank dimensions (metres), substrate shape, palette
  sim/                  Pure simulation: school, food, species, aquascape, care, timeOfDay, random
  state/store.ts        zustand: clock mode, viewpoint, quality, sound, feed/tap requests, care state, load errors
  state/motion.ts       prefers-reduced-motion: prefersReducedMotion() and useReducedMotion()
  scene/
    Experience.tsx      Scene composition
    ErrorBoundary.tsx   Catches render errors and reports them to the store
    ContextWatcher.tsx  WebGL context lost/restored → store
    DaylightDriver.tsx  Clock → eased `daylight` state + water uniforms
    daylight.ts         Shared mutable lighting state
    Lights.tsx          Sun (shadowed), window skylight, lamp, reflection environment
    CameraRig.tsx       Viewpoints and fish follow-cam
    AmbientDirector.tsx Ambient mode: cycles the shots with a slow drift, pauses on user input
    ambient.ts          Pure shot-cycle and drift logic (unit-tested)
    shots.ts            Viewpoint shots, the cabinet each one keeps on screen, follow-cam position
    framing.ts          Aspect-aware framing: dolly back, then widen FOV, on narrow screens
    Effects.tsx         Depth of field, bloom, vignette, tone mapping
    focus.ts            Focus point shared by camera and DoF
    textures.ts         Procedural canvas textures (wood, plaster, fabric, rug, sand, bark, art)
    room/Room.tsx       Walls, window, sky, curtains, baseboards
    room/Furniture.tsx  Composes the furniture pieces around one shared material set
    room/furniture/     One file per piece (Cabinet, Sofa, CoffeeTable, Rug, FloorLamp,
                        PottedPlant, Bookshelf, WallArt); materials.ts holds the shared materials
    tank/Tank.tsx       Composes the tank parts at TANK_ORIGIN; owns the backlit rear panel
    tank/TankGlass.tsx  Glass panes, green edges, meniscus line, algae film
    tank/WaterSurface.tsx  Water surface shader (sheen above, mirror below)
    tank/FilterPipes.tsx   Filter intake and outflow pipes, heater and its glow
    tank/LightFixture.tsx  LED fixture on legs, day and moonlight spots
    tank/FeedTarget.tsx    Invisible click target over the water: click-to-feed
    tank/Aquascape.tsx  Substrate, rocks, driftwood, plants (grown by the care loop), anemone
    tank/aquascapeGeometry.ts  Pure geometry builders for the aquascape (unit-tested)
    tank/WaterFx.tsx    Bubbles, suspended particles, light shafts
    tank/underwater.ts  Water uniforms and the `makeUnderwater` material patch
    fish/FishLoader.tsx Error boundary, download timeout and Retry remount around FishView
    fish/FishView.tsx   GLB loading, instanced fish and food, fixed-step sim loop
    fish/assets.ts      Fish GLB URLs
    fish/simulation.ts  The running school + food pool
  ui/Hud.tsx            Clock, viewpoints, ambient, feed/sound/quality/fullscreen, keyboard shortcuts
  ui/Care.tsx           Tap/Wipe the glass chips and the fish name label in Follow mode
  ui/icons.tsx          Inline SVG icons for the compact two-row phone bar
  ui/fullscreen.ts      Fullscreen API toggle and `fullscreenchange` hook
  audio/ambience.ts     Procedural WebAudio filter hum, trickle and bubbles
public/                 Fish GLBs (clownfish, blue tang, angelfish), favicon.svg
pwa/service-worker.js   Hand-written service worker; vite-pwa.ts fills in the precache list
vite-pwa.ts             Manifest, icons rasterised from favicon.svg, service worker (build time)
tests/                  Vitest unit tests for src/sim and the store; tests/e2e Playwright smoke test, load-error and PWA specs
```
