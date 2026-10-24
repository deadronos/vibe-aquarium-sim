import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ErrorBoundary } from './scene/ErrorBoundary';
import { Experience } from './scene/Experience';
import { BASE_FOV } from './scene/framing';
import { useAquarium } from './state/store';
import { Hud } from './ui/Hud';

/**
 * Builds the renderer ourselves so a failed WebGL context (blocklisted GPU, exhausted contexts)
 * becomes the HUD's "no WebGL" message instead of an unhandled rejection behind the veil.
 */
const createRenderer = (defaults: THREE.WebGLRendererParameters) => {
  try {
    return new THREE.WebGLRenderer({
      ...defaults,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    useAquarium.getState().setLoadError('webgl');
    throw error;
  }
};

const onSceneCrash = () => useAquarium.getState().setLoadError('crash');

export default function App() {
  const quality = useAquarium((state) => state.quality);
  const noWebGL = useAquarium((state) => state.loadError === 'webgl');
  return (
    <>
      {!noWebGL && (
        <ErrorBoundary onError={onSceneCrash}>
          <Canvas
            shadows="percentage"
            dpr={quality === 'low' ? 1 : [1, 1.5]}
            camera={{ fov: BASE_FOV, near: 0.03, far: 40, position: [0.55, 1.38, 2.3] }}
            gl={createRenderer}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.AgXToneMapping;
              gl.toneMappingExposure = 1;
            }}
          >
            <Experience />
          </Canvas>
        </ErrorBoundary>
      )}
      <Hud />
    </>
  );
}
