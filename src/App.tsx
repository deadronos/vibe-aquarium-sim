import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import { Environment } from '@react-three/drei';
import { ECS, world } from './store';
import type { Entity } from './store';
import { Tank } from './components/Tank';
import { Water } from './components/Water';
import { Fish } from './components/Fish';
import { Food } from './components/Food';
import { Decoration } from './components/Decoration';
import { FeedingController } from './components/FeedingController';
import { EffectsManager } from './components/EffectsManager';
import { AmbientParticles } from './components/AmbientParticles';
import { PostProcessing } from './components/PostProcessing';
import { HUD } from './components/ui/HUD';
import DebugHUD from './components/DebugHUD';
import { FishRenderSystem } from './systems/FishRenderSystem';
import { BoidsSystem } from './systems/BoidsSystem';
import { ExcitementSystem } from './systems/ExcitementSystem';
import { SchedulerSystem } from './systems/SchedulerSystem';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { SIMULATION_BOUNDS, TANK_DIMENSIONS } from './config/constants';
import * as THREE from 'three';
import { AdaptiveQualityManager } from './performance/AdaptiveQualityManager';
import { VisualQualityProvider } from './performance/VisualQualityProvider';

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

    // Spawn Decorations (Tasteful Scatter)
    const spawnDecoration = (type: 'seaweed' | 'coral' | 'rock', count: number) => {
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * (TANK_DIMENSIONS.width - 0.4); // Margin from walls
        const z = (Math.random() - 0.5) * (TANK_DIMENSIONS.depth - 0.4);
        const y = -TANK_DIMENSIONS.height / 2; // On the floor

        // Seed decoration properties at spawn time (pure, non-render code)
        let decorationProps: Record<string, unknown> = {};
        if (type === 'seaweed') {
          decorationProps = {
            blades: [
              { height: 0.4 + Math.random() * 0.2, offset: 0, phase: Math.random() * Math.PI * 2 },
              {
                height: 0.3 + Math.random() * 0.15,
                offset: 0.05,
                phase: Math.random() * Math.PI * 2,
              },
              {
                height: 0.35 + Math.random() * 0.15,
                offset: -0.04,
                phase: Math.random() * Math.PI * 2,
              },
            ],
          };
        } else if (type === 'coral') {
          const colors = ['#ff6b6b', '#ff8e72', '#ffa07a', '#e056fd'];
          decorationProps = { color: colors[Math.floor(Math.random() * colors.length)] };
        } else if (type === 'rock') {
          const s = 0.8 + Math.random() * 0.4;
          const gray = 0.3 + Math.random() * 0.2;
          decorationProps = { scale: s, color: new THREE.Color(gray, gray * 0.95, gray * 0.9) };
        }

        world.add({
          isDecoration: true,
          decorationType: type,
          position: new Vector3(x, y, z),
          decorationProps,
        });
      }
    };

    spawnDecoration('seaweed', 5);
    spawnDecoration('coral', 5);
    spawnDecoration('rock', 5);

    if (typeof window !== 'undefined') {
      // Debug helper: add N fish at runtime to stress test performance
      // Usage: window.__vibe_addFish(100);
      // Returns number added
      (window as any).__vibe_addFish = (n: number) => {
        let added = 0;
        for (let i = 0; i < n; i++) {
          world.add({
            isFish: true,
            isBoid: true,
            position: new Vector3(
              (Math.random() - 0.5) * (SIMULATION_BOUNDS.x * 2),
              (Math.random() - 0.5) * (SIMULATION_BOUNDS.y * 2),
              (Math.random() - 0.5) * (SIMULATION_BOUNDS.z * 2)
            ),
            velocity: new Vector3((Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1),
            steeringForce: new Vector3(),
            externalForce: new Vector3(),
            targetVelocity: new Vector3(),
            excitementLevel: 0,
            excitementDecay: 0,
          });
          added++;
        }
        return added;
      };
    }
  }, []);
  return null;
};

function App() {
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const spotLightRef = useRef<THREE.SpotLight | null>(null);

  return (
    <>
      {/* HUD overlay outside Canvas */}
      <HUD />
      <DebugHUD />

      <VisualQualityProvider>
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
            <AdaptiveQualityManager
              directionalLightRef={directionalLightRef}
              spotLightRef={spotLightRef}
            />
            {/* Hemisphere light gives a soft sky/ground ambient */}
            <hemisphereLight color={0xaaccff} groundColor={0x101020} intensity={0.8} />
            {/* Directional key light to give stronger highlights */}
            <directionalLight
              ref={directionalLightRef}
              position={[1.5, 3, 1]}
              intensity={1.2}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            {/* Soft spot to add depth & visible speculars */}
            <spotLight
              ref={spotLightRef}
              position={[2, 4, 2]}
              angle={0.6}
              penumbra={0.6}
              intensity={1.2}
              castShadow
            />
            {/* Cool fill from back */}
            <pointLight position={[-2, -2, -2]} intensity={0.5} color="#004488" />
            {/* Environment map for realistic PBR reflections */}
            <Environment preset="studio" background={true} />

            <Tank />
            <Water />

            <Spawner />
            <SchedulerSystem />
            <BoidsSystem />
            <ExcitementSystem />
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

          <AmbientParticles />
          <PostProcessing />

          <OrbitControls target={[0, 0, 0]} />
        </Canvas>
      </VisualQualityProvider>
    </>
  );
}

export default App;
