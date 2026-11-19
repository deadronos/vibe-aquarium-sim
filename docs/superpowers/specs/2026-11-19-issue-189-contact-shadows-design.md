# Contact Shadows and Fish Grounding Design

**Intent:** Make the furniture feel planted in the room and make fish read as moving within the
water volume rather than floating over a detached sand plane.

## Goals

- Add soft contact occlusion beneath the cabinet, sofa, coffee table, lamp, plant, and bookshelf.
- Add a cheap projected blob shadow beneath every fish that follows its x/z position and adapts to
  distance from the sloped substrate.
- Keep Lite rendering to one extra fish-shadow draw call and avoid per-frame allocations.

## Non-goals

- No real-time AO post-process, depth reconstruction, or additional sun-shadow pass.
- No material or geometry redesign for the room or fish.
- No new downloaded image assets.

## Approaches

1. **Screen-space AO / N8AO:** high fidelity, but adds a full-screen pass and creates another
   renderer/debugging failure mode.
2. **Drei ContactShadows:** reusable and familiar, but still re-renders scene geometry into an
   offscreen target and is unnecessary for static furniture.
3. **Procedural instanced blob shadows (selected):** uses one generated radial alpha texture,
   static furniture instances, and one fish instance batch. It is deterministic, inexpensive, and
   works with the existing underwater shader path.

## Architecture

- `softShadowTexture()` creates and caches the procedural radial mask under `src/scene/textures.ts`.
- `src/scene/shadows.ts` owns allocation-free shadow-matrix and fish-shadow layout helpers.
- `RoomContactShadows` writes a fixed furniture layout once with a single instanced mesh; it is
  omitted in Lite because the existing sun shadow map already provides the broad grounding.
- `FishView` updates a second instanced mesh in its existing fish loop. Each blob projects onto
  the local `substrateHeight(x, z)` tangent, scales/fades with height, and receives the same
  underwater material patch as the fish.

## Acceptance

- Sofa and Up close views show visible, soft furniture and fish grounding without changing the
  composition.
- Unit tests cover shadow matrix placement, sloped-sand projection, and altitude fade.
- Lite smoke rendering continues to pass, and the rendering benchmark remains within normal
  run-to-run variance for the documented Lite profile.
- Formatting, lint, typecheck, unit tests, build, bundle budget, and Playwright smoke pass.
