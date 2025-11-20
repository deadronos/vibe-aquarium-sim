import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics, RigidBody, RapierRigidBody } from '@react-three/rapier'
import { Vector3 } from 'three'
import { Tank } from './components/Tank'
import { Water } from './components/Water'
import { Fish } from './components/Fish'
import { BoidsSystem } from './systems/BoidsSystem'
import { FoodSystem } from './systems/FoodSystem'
import { world, store, ECS, type Entity } from './store'
import './App.css'

const SpawnFish = () => {
  useEffect(() => {
    // Spawn 50 fish
    for (let i = 0; i < 50; i++) {
      store.add({
        fish: true,
        position: new Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        ),
        velocity: new Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        )
      })
    }
  }, [])
  return null
}

const FeedPlane = () => {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        store.add({
          food: true,
          position: new Vector3(e.point.x, 4, e.point.z),
          velocity: new Vector3(0, -1, 0)
        })
      }}
      visible={false}
    >
      <planeGeometry args={[100, 100]} />
    </mesh>
  )
}

const Food = ({ entity }: { entity: Entity }) => {
  const rigidBody = useRef<RapierRigidBody>(null)

  // Sync physics position back to ECS
  useFrame(() => {
    if (rigidBody.current) {
      const pos = rigidBody.current.translation()
      entity.position.set(pos.x, pos.y, pos.z)
    }
  })

  return (
    <RigidBody
      ref={rigidBody}
      position={entity.position}
      colliders="ball"
      restitution={0.5}
    >
      <mesh>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial color="brown" />
      </mesh>
    </RigidBody>
  )
}

function App() {
  return (
    <div id="canvas-container">
      <Canvas camera={{ position: [0, 5, 12], fov: 50 }} shadows>
        <color attach="background" args={['#202030']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <OrbitControls makeDefault />

        <Physics debug={false} gravity={[0, -9.81, 0]}>
          <Tank />
          <Water />
          <ECS.Entities in={world.with('fish')}>
            {entity => <Fish entity={entity} />}
          </ECS.Entities>

          <ECS.Entities in={world.with('food')}>
            {entity => <Food entity={entity} />}
          </ECS.Entities>
        </Physics>

        <BoidsSystem />
        <FoodSystem />
        <SpawnFish />
        <FeedPlane />

        <gridHelper args={[20, 20]} position={[0, -3.01, 0]} />
      </Canvas>
    </div>
  )
}

export default App
