import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { BoidsSystem } from './BoidsSystem'
import { world } from '../store'
import { Vector3 } from 'three'

// Mock useFrame
const useFrameMock = vi.fn()
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: any) => useFrameMock(cb),
}))

describe('BoidsSystem', () => {
  beforeEach(() => {
    // Clear world
    const entities = [...world.entities]
    for (const e of entities) {
      world.remove(e)
    }
    useFrameMock.mockClear()
    // Note: We cannot easily reset the module-level 'accumulator' variable in BoidsSystem.
    // However, since tests run in a fresh environment or we rely on the large delta to override it, it's okay.
  })

  it('prevents death spiral by clamping accumulator', () => {
    // Setup 1 fish outside bounds to generate constant force
    const fish = world.add({
      fish: true,
      position: new Vector3(10, 0, 0), // Outside X bounds (5)
      velocity: new Vector3(0, 0, 0),
      steeringForce: new Vector3()
    })

    render(<BoidsSystem />)
    const frameCallback = useFrameMock.mock.calls[0][0]

    // 1. Simulate a HUGE lag spike (e.g. 5 seconds)
    // This adds 5.0 to accumulator.
    frameCallback({}, 5.0)

    // 2. Run a few normal frames.
    // Each frame processes maxSubSteps (4) * fixedDelta (1/60 ~= 0.016) ~= 0.064s of simulation.
    // 5.0s / 0.064s ~= 78 frames to catch up.
    // We run 10 frames. The accumulator should still be huge if not clamped.
    for (let i = 0; i < 10; i++) {
      frameCallback({}, 1/60)
    }

    // 3. Check the force on the 11th normal frame.
    frameCallback({}, 1/60)

    // Logic:
    // Force per step = 10.0 (boundsStrongFactor) * 1.0 (weight) = 10.0.
    // Impulse per step = 10.0 * (1/60) = 0.166.
    // Max steps = 4. Max Impulse = 0.666.
    // Normal steps = 1. Normal Impulse = 0.166.

    // If bug exists (spiral), we are still catching up, so subSteps = 4. Impulse = 0.666.
    // If fixed (clamped), accumulator is gone, so subSteps = 1. Impulse = 0.166.

    const forceX = Math.abs(fish.steeringForce!.x)

    // We assert that the system has recovered from the lag spike
    // So force should be close to single step impulse (0.166)
    // If it's > 0.5, it means it's still running 4 steps.
    expect(forceX).toBeLessThan(0.5)
  })
})
