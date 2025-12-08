import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { ECS, world } from "./store";
import type { Entity } from "./store";
import { Tank } from "./components/Tank";
import { Fish } from "./components/Fish";
import { BoidsSystem } from "./systems/BoidsSystem";
import { useEffect } from "react";
import { Vector3 } from "three";

const Spawner = () => {
    useEffect(() => {
        // Spawn 50 fish
        for (let i = 0; i < 50; i++) {
            world.add({
                isFish: true,
                isBoid: true,
                position: new Vector3(
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 15
                ),
                velocity: new Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ),
                steeringForce: new Vector3()
            });
        }
    }, []);
    return null;
}

function App() {
  return (
    <Canvas camera={{ position: [0, 5, 25], fov: 60 }} shadows>
      <color attach="background" args={['#001133']} />

      <Physics gravity={[0, 0, 0]}>
          <ambientLight intensity={0.5} />
          <spotLight position={[20, 20, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />

          <Tank />

          <Spawner />
          <BoidsSystem />

          <ECS.Entities in={world.with('isFish')}>
              {(entity: Entity) => <Fish entity={entity} />}
          </ECS.Entities>
      </Physics>

      <OrbitControls />
    </Canvas>
  )
}

export default App
