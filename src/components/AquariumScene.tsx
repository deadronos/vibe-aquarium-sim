import { Physics } from '@react-three/rapier';
import type { MutableRefObject } from 'react';

import type * as THREE from 'three';

import { AdaptiveQualityManager } from '../performance/AdaptiveQualityManager';
import { ECS, world } from '../store';
import type { Entity } from '../store';
import { ART_DIRECTION_LIGHTING } from '../config/artDirection';
import { isTestHarnessEnabled } from '../utils/testHarness';
import { LivingRoom } from './LivingRoom';
import { SceneLights } from './SceneLights';
import { EnvironmentMap } from './EnvironmentMap';
import { Tank } from './Tank';
import { Water } from './Water';
import { Fish } from './Fish';
import { Food } from './Food';
import { Decoration } from './Decoration';
import { FeedingController } from './FeedingController';
import { EffectsManager } from './EffectsManager';
import { Spawner } from '../systems/Spawner';
import { SchedulerSystem } from '../systems/SchedulerSystem';
import { BoidsSystem } from '../systems/BoidsSystem';
import { ExcitementSystem } from '../systems/ExcitementSystem';
import { FishRenderSystem } from '../systems/FishRenderSystem';
import { TestHarnessDriver } from '../systems/TestHarnessDriver';

interface AquariumSceneProps {
  directionalLightRef: MutableRefObject<THREE.DirectionalLight | null>;
  spotLightRef: MutableRefObject<THREE.SpotLight | null>;
  initialShadowMapSize: number;
}

export function AquariumScene({
  directionalLightRef,
  spotLightRef,
  initialShadowMapSize,
}: AquariumSceneProps) {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      <AdaptiveQualityManager
        directionalLightRef={directionalLightRef}
        spotLightRef={spotLightRef}
      />
      <LivingRoom />
      {/* Broad room light stays quiet so the tank remains the focal plane. */}
      <hemisphereLight
        color={ART_DIRECTION_LIGHTING.hemisphereSky}
        groundColor={ART_DIRECTION_LIGHTING.hemisphereGround}
        intensity={ART_DIRECTION_LIGHTING.hemisphereIntensity}
      />
      <SceneLights
        directionalLightRef={directionalLightRef}
        spotLightRef={spotLightRef}
        initialShadowMapSize={initialShadowMapSize}
      />
      {/* Cool fill from the tank side keeps fish readable without a neon rim. */}
      <pointLight
        position={[-2, -1.5, -2]}
        intensity={ART_DIRECTION_LIGHTING.waterFillIntensity}
        color={ART_DIRECTION_LIGHTING.waterFillColor}
      />
      {/* Environment map for realistic PBR reflections */}
      {/* Environment map for realistic PBR reflections */}
      {/* Use manual loader to avoid deprecated RGBELoader in drei preset */}
      <EnvironmentMap />

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
      {isTestHarnessEnabled() && <TestHarnessDriver />}
    </Physics>
  );
}
