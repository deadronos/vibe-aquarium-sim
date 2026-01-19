# Performance Guidelines

Our goal is a steady **60+ FPS**. In a physics-heavy simulation, performance is managed primarily through memory discipline.

## 🚀 Key Optimization: Vector Reuse

In `useFrame` loops (especially in Systems), **never** create new `Vector3`, `Matrix4`, or `Euler` instances. This causes Garbage Collection (GC) spikes that lead to frame drops.

### ❌ The Bad Way

```typescript
useFrame(() => {
  const target = new Vector3(1, 2, 3); // BAD: New object every frame
  entity.position.lerp(target, 0.1);
});
```

### ✅ The Good Way

Create module-level temporary vectors to reuse.

```typescript
const tempVec = new Vector3(); // Module scope

const MySystem = () => {
  useFrame(() => {
    tempVec.set(1, 2, 3); // Reuse the same object
    entity.position.lerp(tempVec, 0.1);
  });
};
```

## 🏎️ General Tips

- **Loops**: Prefer simple `for...of` loops over `world.with(...)` for performance.
- **Miniplex Queries**: Use queries instead of manual array filtering to leverage Miniplex's internal indexing.
- **R3F Hooks**: Use `@react-three/fiber` hooks (`useFrame`, `useThree`) for render-loop logic.
