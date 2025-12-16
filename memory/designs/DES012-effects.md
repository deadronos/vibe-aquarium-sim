# Effects Design

## Click Ripple Effect
**File:** `src/components/effects/ClickRipple.tsx`

Visual feedback when spawning food.

| Property | Value |
|----------|-------|
| Shape | Ring geometry (torus) |
| Initial size | 0.08-0.12m |
| Final size | ~1.5m |
| Duration | 600ms |
| Easing | Ease-out cubic |
| Color | Cyan (#4fc3f7) |

**Animation:**
- Scale from 0.1 → 1.5 with eased progress
- Opacity fades from 1 → 0
- Self-destructs via `onComplete` callback

---

## Bubble Trail
**File:** `src/components/effects/BubbleTrail.tsx`

Particles trailing behind sinking food.

| Property | Value |
|----------|-------|
| Count | 8 bubbles |
| Size | 4-10mm |
| Rendering | InstancedMesh for performance |
| Color | Cyan with emissive glow |

**Animation:**
- Each bubble has random offset, phase, speed
- Bubbles drift upward with sine/cosine wobble
- Fade out as they rise

---

## Eating Burst
**File:** `src/components/effects/EatingBurst.tsx`

Particle explosion when fish eats food.

| Property | Value |
|----------|-------|
| Count | 10 particles |
| Size | 5-9mm |
| Duration | 350ms |
| Color | Golden (#ffcc00) |

**Animation:**
- Particles explode outward in random directions
- Shrink as they move
- Opacity fades to 0

**Trigger:**
- `BoidsSystem` calls `triggerEatingBurst(position)` when food eaten
- `EffectsManager` listens and spawns burst components

---

## Effects Manager
**File:** `src/components/EffectsManager.tsx`

Singleton event system for triggering effects from systems:
```ts
// Systems call this
triggerEatingBurst(position: Vector3)

// EffectsManager maintains state
const [bursts, setBursts] = useState<BurstEffect[]>([])
```

Decouples systems (which can't maintain React state) from effect rendering.
