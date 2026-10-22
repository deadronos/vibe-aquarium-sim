import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience } from './scene/Experience';
import { useAquarium } from './state/store';
import { Hud } from './ui/Hud';

export default function App() {
  const quality = useAquarium((state) => state.quality);
  return (
    <>
      <Canvas
        shadows="percentage"
        dpr={quality === 'high' ? [1, 1.75] : 1}
        camera={{ fov: 42, near: 0.03, far: 40, position: [0.55, 1.38, 2.3] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.AgXToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Experience />
      </Canvas>
      <Hud />
    </>
  );
}
