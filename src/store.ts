import { World } from 'miniplex'
import { createReactAPI } from 'miniplex-react'
import { Vector3 } from 'three'

export type Entity = {
  id?: number
  position: Vector3
  velocity?: Vector3
  steeringForce?: Vector3
  
  // Tags
  fish?: boolean
  food?: boolean
  
  // Boids properties
  separation?: number
  alignment?: number
  cohesion?: number
}

export const world = new World<Entity>()
export const ECS = createReactAPI(world)
export const store = world


