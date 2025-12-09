import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import { Environment } from '@react-three/drei';
import { ECS, world } from './store';
import type { Entity } from './store';
import { Tank } from './components/Tank';
import { Fish } from './components/Fish';
import { BoidsSystem } from './systems/BoidsSystem';
import { useEffect } from 'react';
import { Vector3 } from 'three';
import * as THREE from 'three';

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
          (Math.random() - 0.5) * 1.5 // Spread across depth
        ),
        velocity: new Vector3(
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 1
        ),
        steeringForce: new Vector3(),
      });
    }
  }, []);
  return null;
};

function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 50 }}
      shadows
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <color attach="background" args={['#000510']} />

      <Physics gravity={[0, 0, 0]}>
        {/* Hemisphere light gives a soft sky/ground ambient */}
        <hemisphereLight color={0xaaccff} groundColor={0x101020} intensity={0.8} />
        {/* Directional key light to give stronger highlights */}
        <directionalLight
          position={[1.5, 3, 1]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Soft spot to add depth & visible speculars */}
        <spotLight position={[2, 4, 2]} angle={0.6} penumbra={0.6} intensity={1.2} castShadow />
        {/* Cool fill from back */}
        <pointLight position={[-2, -2, -2]} intensity={0.5} color="#004488" />
        {/* Environment map for realistic PBR reflections */}
        <Environment preset="studio" background={true} />

        <Tank />

        <Spawner />
        <BoidsSystem />

        <ECS.Entities in={world.with('isFish')}>
          {(entity: Entity) => <Fish entity={entity} />}
        </ECS.Entities>
      </Physics>

      <OrbitControls target={[0, 0, 0]} />
    </Canvas>
  );
}

export default App;
