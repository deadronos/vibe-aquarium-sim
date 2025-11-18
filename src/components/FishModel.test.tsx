import { describe, it, expect, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { FishModel } from './FishModel'
import { Vector3 } from 'three'
import type { Entity } from '../store'

// Mock useFrame to capture the callback
const useFrameMock = vi.fn()
vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual('@react-three/fiber')
  return {
    ...actual,
    useFrame: (cb: any) => useFrameMock(cb),
  }
})

describe('FishModel', () => {
  it('animates tail based on speed', async () => {
    const entity: Entity = {
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(2, 0, 0),
    }

    // @ts-ignore
    const renderer = await ReactThreeTestRenderer.create(
      <FishModel entity={entity} />
    )
    
    const group = renderer.scene.children[0]
    const tail = group.children[1]
    
    // Verify useFrame was called
    expect(useFrameMock).toHaveBeenCalled()
    
    // Get the callback
    const frameCallback = useFrameMock.mock.calls[0][0]
    
    // Call it with a mock state
    const mockState = {
      clock: { elapsedTime: 1 }
    }
    frameCallback(mockState)
    
    // Now check rotation
    // Math.sin(1 * (5 + 2 * 5)) * 0.2
    // Math.sin(1 * 15) * 0.2
    // Math.sin(15) is approx 0.65
    // 0.65 * 0.2 = 0.13
    
    expect(tail.instance.rotation.y).not.toBe(0)
    expect(tail.instance.rotation.y).toBeCloseTo(Math.sin(15) * 0.2)
  })
})
