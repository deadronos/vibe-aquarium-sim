# Decoration System Design

## Overview
Players can place decorations (seaweed, coral, rocks) on the tank floor.

## Entity Structure
```ts
{
  isDecoration: true,
  decorationType: 'seaweed' | 'coral' | 'rock',
  position: Vector3  // On tank floor
}
```

## Decoration Types

### Seaweed
- **Visual:** 3 green box blades of varying heights
- **Animation:** Sways gently using sine wave on rotation
- **Code:** `rotation.z = sin(time * 0.8) * 0.15`

### Coral
- **Visual:** Branching cylinder structure
- **Colors:** Random from pink/orange palette
- **Static:** No animation

### Rock
- **Visual:** Dodecahedron with flat shading
- **Scale:** Random 0.8-1.2x
- **Color:** Random gray tones

## Physics
All decorations are `RigidBody type="fixed"` with `CuboidCollider`.

## Placement Flow
1. User clicks decoration button in HUD
2. `gameStore.isPlacingDecoration = true`
3. Click on tank → `FeedingController` spawns decoration at floor Y
4. Position clamped to simulation bounds
5. `stopPlacingDecoration()` called, exits placement mode

## Future Enhancements
- [ ] Decoration removal mode
- [ ] Fish obstacle avoidance for decorations
- [ ] Decoration limit per tank
- [ ] Save/load decorations
