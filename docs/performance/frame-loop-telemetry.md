# Frame-loop telemetry profile

Issue #144 keeps diagnostics opt-in so the ordinary render and scheduler paths
do not pay for clocks, status-record creation, or debug-entry creation.

## Runtime contract

- `window.__vibe_debug` is the explicit telemetry signal. The Debug HUD creates
  the collector while it is visible and removes it when hidden.
- `FishRenderSystem` samples `performance.now()` and mutates its stable status
  object only while the collector exists. Adaptive instance flushing continues
  without telemetry.
- `SchedulerSystem` samples timing when the collector exists or when adaptive
  scheduling is enabled, because the latter needs an EMA to make its policy
  decision. The fixed-step update itself always runs.
- Status objects are created once per mounted system and mutated thereafter.

## Automated steady-state check

The focused tests spy on `performance.now()` and reset the status globals before
each callback. With diagnostics and adaptive scheduling disabled, both systems
must make zero clock calls and leave their status fields unavailable. With the
collector enabled, the scheduler must publish a status object and reuse the
same object on the next frame.

```bash
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase2-telemetry.localstorage' \
  npm run test -- tests/SchedulerSystem.test.tsx tests/FishRenderSystem.adaptive.test.tsx
```

This is a behavioral allocation guard, not a substitute for a heap profile.

## Manual browser profile

1. Run `npm run build && npm run test:smoke` to verify the production bundle.
2. Start the production preview with `npm run preview` (or serve `dist/` at
   the configured base path) and open Chrome DevTools Performance.
3. Record 10 seconds with the Debug HUD hidden at 30, 60, and 120 Hz display
   emulation. Check that the Main track does not contain recurring
   `performance.now`-driven telemetry work and that heap growth stays flat after
   warm-up.
4. Show the Debug HUD and repeat the recording. Diagnostic samples and status
   updates should now appear; compare the overhead separately from the
   telemetry-disabled baseline.
5. Save the profile when investigating a regression and include the fish count,
   browser, refresh-rate emulation, and whether adaptive scheduling was enabled.
