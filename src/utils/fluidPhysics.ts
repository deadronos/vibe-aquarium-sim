import { Vector3 } from 'three'

const tempDrag = new Vector3()
const tempBuoyancy = new Vector3()

export const calculateBuoyancyAndDrag = (
  mass: number,
  velocity: Vector3,
  gravity: number,
  buoyancyStrength: number,
  dragFactor: number,
  submersion: number,
  resultForce: Vector3
) => {
  if (submersion <= 0) {
    resultForce.set(0, 0, 0)
    return
  }

  // Buoyancy: Upward force
  // Force = (0, mass * gravity * buoyancyStrength * submersion, 0)
  tempBuoyancy.set(0, mass * gravity * buoyancyStrength * submersion, 0)

  // Drag: Opposite to velocity
  // Force = -velocity * dragFactor * mass * submersion (scale with size and contact)
  tempDrag.copy(velocity).multiplyScalar(-dragFactor * mass * submersion)

  // Combine
  resultForce.copy(tempBuoyancy).add(tempDrag)
}
