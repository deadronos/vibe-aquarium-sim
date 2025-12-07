import { Vector3 } from 'three'

const tempDrag = new Vector3()
const tempBuoyancy = new Vector3()

export const calculateBuoyancyAndDrag = (
  mass: number,
  velocity: Vector3,
  gravity: number,
  buoyancyStrength: number,
  dragFactor: number,
  resultForce: Vector3
) => {
  // Buoyancy: Upward force
  // Force = (0, mass * gravity * buoyancyStrength, 0)
  tempBuoyancy.set(0, mass * gravity * buoyancyStrength, 0)

  // Drag: Opposite to velocity
  // Force = -velocity * dragFactor * mass (to scale with size)
  tempDrag.copy(velocity).multiplyScalar(-dragFactor * mass)

  // Combine
  resultForce.copy(tempBuoyancy).add(tempDrag)
}
