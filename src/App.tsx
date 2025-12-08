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
        // Spawn 30 fish
        for (let i = 0; i < 30; i++) {
            world.add({
                isFish: true,
                isBoid: true,
                position: new Vector3(
                    (Math.random() - 0.5) * 3.5, // Spread across width
                    (Math.random() - 0.5) * 1.5, // Spread across height
                    (Math.random() - 0.5) * 1.5  // Spread across depth
                ),
                velocity: new Vector3(
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 1
                ),
                steeringForce: new Vector3()
            });
        }
    }, []);
    return null;
}

function App() {
  return (
    <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} shadows>
      <color attach="background" args={['#000510']} />

      <Physics gravity={[0, 0, 0]}>
          <ambientLight intensity={0.3} />
          <spotLight position={[2, 4, 2]} angle={0.5} penumbra={1} intensity={3} castShadow />
          <pointLight position={[-2, -2, -2]} intensity={0.5} color="#004488" />

          <Tank />

          <Spawner />
          <BoidsSystem />

          <ECS.Entities in={world.with('isFish')}>
              {(entity: Entity) => <Fish entity={entity} />}
          </ECS.Entities>
      </Physics>

      <OrbitControls target={[0, 0, 0]} />
    </Canvas>
  )
}

export default App
