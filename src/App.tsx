import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import { Environment } from '@react-three/drei';
import { ECS, world } from './store';
import type { Entity } from './store';
import { Tank } from './components/Tank';
import { Water } from './components/Water';
import { WaterCurrentSystem } from './systems/WaterCurrentSystem';
import { Fish } from './components/Fish';
import { Food } from './components/Food';
import { Decoration } from './components/Decoration';
import { FeedingController } from './components/FeedingController';
import { EffectsManager } from './components/EffectsManager';
import { HUD } from './components/ui/HUD';
import { FishRenderSystem } from './systems/FishRenderSystem';
import { BoidsSystem } from './systems/BoidsSystem';
import { WaterResistanceSystem } from './systems/WaterResistanceSystem';
import { SchedulerSystem } from './systems/SchedulerSystem';
import { useEffect } from 'react';
import { Vector3 } from 'three';
import { SIMULATION_BOUNDS } from './config/constants';
import * as THREE from 'three';

const Spawner = () => {
  useEffect(() => {
    // Spawn 30 fish
    for (let i = 0; i < 30; i++) {
      world.add({
        isFish: true,
        isBoid: true,
        position: new Vector3(
          (Math.random() - 0.5) * (SIMULATION_BOUNDS.x * 2),
          (Math.random() - 0.5) * (SIMULATION_BOUNDS.y * 2),
          (Math.random() - 0.5) * (SIMULATION_BOUNDS.z * 2)
        ),
        velocity: new Vector3(
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 1
        ),
        steeringForce: new Vector3(),
        externalForce: new Vector3(),
        targetVelocity: new Vector3(),
        excitementLevel: 0,
        excitementDecay: 0,
      });
    }
  }, []);
  return null;
};

function App() {
  return (
    <>
      {/* HUD overlay outside Canvas */}
      <HUD />

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

        <Physics gravity={[0, -9.81, 0]}>
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
          <Water />

          <Spawner />
          <SchedulerSystem />
          <BoidsSystem />
          <WaterResistanceSystem />
          <WaterCurrentSystem />
          <FishRenderSystem />

          <ECS.Entities in={world.with('isFish')}>
            {(entity: Entity) => <Fish entity={entity} />}
          </ECS.Entities>

          <ECS.Entities in={world.with('isFood')}>
            {(entity: Entity) => <Food entity={entity} />}
          </ECS.Entities>

          <ECS.Entities in={world.with('isDecoration')}>
            {(entity: Entity) => <Decoration entity={entity} />}
          </ECS.Entities>

          <FeedingController />
          <EffectsManager />
        </Physics>

        <OrbitControls target={[0, 0, 0]} />
      </Canvas>
    </>
  );
}

export default App;
