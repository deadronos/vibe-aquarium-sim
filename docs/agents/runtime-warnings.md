# Runtime warning ledger

These entries are intentionally tracked instead of being hidden with a global
console filter. Reproduce them against the production-style preview with:

```bash
npm run build
PORT=5175 node scripts/serve-dist-with-base.js
```

Then open `http://127.0.0.1:5175/vibe-aquarium-sim/` in Chromium and inspect
the browser console.

## `THREE.Clock` deprecation

- **Observed message:** `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`
- **Source:** R3F/Drei runtime bundle, not application code.
- **Pinned packages:** `three@0.184.0`, `@react-three/fiber@9.6.1`,
  `@react-three/drei@10.7.7`.
- **Upstream reference:** [react-three-fiber issue #3741](https://github.com/pmndrs/react-three-fiber/issues/3741)
- **Removal condition:** upgrade to a compatible R3F/Drei release that uses
  `THREE.Timer`, then confirm this message is absent in the preview console.

## Rapier initialization parameters

- **Observed message:** `using deprecated parameters for the initialization function; pass a single object instead`
- **Source:** Rapier compatibility runtime loaded by `@react-three/rapier`.
- **Pinned packages:** `@react-three/rapier@2.2.0`,
  `@dimforge/rapier3d-compat@0.19.2`.
- **Upstream reference:** [rapier.js issue #341](https://github.com/dimforge/rapier.js/issues/341)
- **Removal condition:** upgrade to a compatible Rapier wrapper/runtime that
  uses the object-form initialization API, then confirm this message is absent
  in the preview console.

## Resolved locally: soft shadow map warning

Three.js also reported that `PCFSoftShadowMap` is deprecated. The Canvas now
requests the supported percentage/PCF shadow mode explicitly in
`src/SimulationScene.tsx`; the warning no longer appears in the preview
console. Keep the browser smoke check active so a future dependency change
does not silently reintroduce it.
