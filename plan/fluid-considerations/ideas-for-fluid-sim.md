Implementing a "true" volumetric fluid simulation (like water filling a glass and splashing) in the browser is extremely computationally expensive and usually not feasible for a real-time game loop alongside other logic.

However, for a fish tank, you rarely need full Navier-Stokes fluid dynamics. You usually need the **illusion** of fluid.

Here are the three tiers of "Fluid Sim" for React Three Fiber + Rapier, ranging from "Visual Only" to "Physics Simulation."

-----

### Tier 1: The "Visual & Physics Hack" (Recommended)

This is how 99% of games handle water. You simulate the **effects** of water (drag, buoyancy, refraction) without simulating the water particles themselves.

#### 1\. Visuals (Refraction & Caustics)

Use `@react-three/drei` to replace your `meshPhysicalMaterial`. This gives you realistic glass/water distortion without heavy calculation.

```bash
npm install @react-three/drei
```

```tsx
import { MeshTransmissionMaterial } from '@react-three/drei'

// Replace your Water Surface material with this:
<MeshTransmissionMaterial
  backside
  samples={4}
  thickness={0.5}
  chromaticAberration={0.02}
  anisotropy={0.1}
  distortion={0.1} // Wobbly look
  distortionScale={0.1}
  temporalDistortion={0.1} // Animates the wobble over time
  color="#aaddff"
/>
```

#### 2\. Physics (Buoyancy & Drag)

Rapier doesn't know "water" exists. You must manually apply forces to objects inside the tank zone.
**What it takes:** A hook that checks if a RigidBody is below the water line (`y < 3`), and if so, applies:

1.  **Buoyancy:** An upward force to counteract gravity.
2.  **Drag:** A force opposite to velocity to slow things down (viscosity).

**The Math:**
$$F_{drag} = -k \cdot v$$
(Where $k$ is viscosity and $v$ is velocity)

**The Component:**

```tsx
export const WaterVolume = () => {
  // Using a sensor collider to detect entry/exit
  return (
    <CuboidCollider 
      args={[5, 3, 3]} 
      position={[0, 0, 0]} 
      sensor 
      onIntersectionEnter={(payload) => {
         // Add rigidBody to a list of "submerged objects"
      }}
      onIntersectionExit={(payload) => {
         // Remove from list
      }}
    />
  )
}
// *Note: You need a manager in useFrame to loop through submerged objects 
// and apply rigidBody.applyImpulse({x:0, y:0.5, z:0}) per frame.*
```

-----

### Tier 2: Surface Simulation (GPGPU)

If you want the surface of the water to ripple when fish jump or swim near the top, you need a **2D Heightmap Simulation**.

**What it takes:**

1.  **GPU Computation:** You create a custom shader that calculates wave propagation on a 2D plane.
2.  **Displacement Map:** You feed that data into the standard material of your water surface to move the vertices up and down.

There is a great library for this that works with R3F: `gpu-io` or manual custom shaders.

  * **Pros:** Highly interactive surface (ripples, rain drops).
  * **Cons:** Complex shader math; doesn't affect physics inside the tank.

-----

### Tier 3: Actual Particle Fluid (SPH)

If you want to actually *pour* water or have the fish displace volumetric liquid, you need **Smoothed Particle Hydrodynamics (SPH)**.

**Warning:** This will likely drop your FPS significantly if not highly optimized.

**Option A: Rapier's "Salad" (Experimental)**
The Rapier engine (in Rust) actually *has* a fluid simulation module (codenamed "Salad").

  * **Status:** It is extremely experimental and not fully exposed in `@react-three/rapier` yet. You would have to write raw JavaScript bindings to the Rapier WASM core to spawn fluid particles.

**Option B: Screen Space Fluid (Metaballs)**
You render thousands of small spheres (particles) using a separate physics engine (like a simplified verlet integration) and then use a "Gooey" post-processing effect to blend them together.

1.  **Simulation:** Use a GPU-based particle system (e.g., `three-gpu-particle-system`).
2.  **Rendering:** Render particles to an off-screen buffer.
3.  **Post-Process:** Blur the buffer and use a threshold filter to make them look like a connected liquid blob.

-----

### Summary Recommendation

For a fish tank, **Tier 1 is usually the correct answer**. The fish don't need to swim through individual water molecules; they just need to *look* like they are distorting light and *feel* like they are swimming in a thick medium.

**Would you like me to write the `useBuoyancy` hook so any object (fish, food, decoration) dropped into the tank automatically floats and experiences water drag?**