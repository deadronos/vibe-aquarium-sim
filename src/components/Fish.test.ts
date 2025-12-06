
import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'

class MockRigidBody {
    public velocity = new Vector3(0, 0, 0)

    setLinvel(v: Vector3) {
        this.velocity.copy(v)
    }

    linvel() {
        return this.velocity.clone()
    }

    // Simulate physics collision (bounce against wall at x=10)
    physicsStep() {
        if (this.velocity.x > 0) {
            // Simulate hitting a wall and bouncing back
            this.velocity.x = -this.velocity.x * 0.5
        }
    }
}

class Entity {
    public velocity = new Vector3(0, 0, 0)
}

describe('Fish Component Logic', () => {
    it('reproduces the collision overwrite bug', () => {
        const rb = new MockRigidBody()
        const entity = new Entity()

        // Initial state
        entity.velocity.set(1, 0, 0)
        rb.setLinvel(entity.velocity)

        // Run simulation for 2 frames
        for (let i = 0; i < 2; i++) {
            // --- FRAME START ---

            // Current Fish.tsx Logic:
            // 1. Write entity velocity to RB
            rb.setLinvel(entity.velocity)

            // 2. Read RB velocity to entity
            const vel = rb.linvel()
            entity.velocity.copy(vel)

            // 3. Boids Logic (adds force)
            entity.velocity.x += 0.1

            // 4. Physics Step (happens in background)
            rb.physicsStep()

            // --- FRAME END ---
        }

        // Expected behavior if bug exists:
        // Frame 1:
        // - setLinvel(1,0,0) -> RB=(1,0,0)
        // - linvel() -> (1,0,0) -> Entity=(1,0,0)
        // - Boids -> Entity=(1.1,0,0)
        // - PhysicsStep -> RB=(-0.5,0,0) (Bounce!)

        // Frame 2:
        // - setLinvel(1.1,0,0) -> RB=(1.1,0,0)  <-- BUG: Overwrites the bounce (-0.5)
        // - linvel() -> (1.1,0,0) -> Entity=(1.1,0,0)
        // - Boids -> Entity=(1.2,0,0)
        // - PhysicsStep -> RB=(-0.55,0,0)

        // Result: Entity is moving POSITIVE X, ignoring the bounce.
        expect(entity.velocity.x).toBeGreaterThan(0)
    })

    it('verifies the fix with priority ordering', () => {
        const rb = new MockRigidBody()
        const entity = new Entity()

        // Initial state
        entity.velocity.set(1, 0, 0)
        rb.setLinvel(entity.velocity)

        // Run simulation for 2 frames
        for (let i = 0; i < 2; i++) {
            // --- FRAME START ---

            // Proposed Fix Logic:

            // 1. Priority -1: Read RB -> Entity
            const vel = rb.linvel()
            entity.velocity.copy(vel)

            // 2. Priority 0: Boids Logic
            entity.velocity.x += 0.1

            // 3. Priority 1: Write Entity -> RB
            rb.setLinvel(entity.velocity)

            // 4. Physics Step
            rb.physicsStep()

            // --- FRAME END ---
        }

        // Trace:
        // Frame 1:
        // - Read RB(1,0,0) -> Entity=(1,0,0)
        // - Boids -> Entity=(1.1,0,0)
        // - Write RB=(1.1,0,0)
        // - PhysicsStep -> RB=(-0.55,0,0) (Bounce!)

        // Frame 2:
        // - Read RB(-0.55,0,0) -> Entity=(-0.55,0,0) <-- SUCCESS: Captured bounce
        // - Boids -> Entity=(-0.45,0,0)
        // - Write RB=(-0.45,0,0)
        // - PhysicsStep -> RB=(-0.45,0,0) (No bounce, x < 0)

        // Result: Entity is moving NEGATIVE X.
        expect(entity.velocity.x).toBeLessThan(0)
    })
})
