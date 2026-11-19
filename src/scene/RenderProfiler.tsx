import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useAquarium } from '../state/store';
import { FrameProfile } from './renderQuality';
import type { RenderProfileSnapshot } from './renderQuality';

type ProfileWindow = Window & {
  __vibeRenderProfile?: RenderProfileSnapshot | null;
  __vibeResetRenderProfile?: () => void;
};

/** Opt-in fixed-capacity sampler. It is never mounted during normal rendering. */
export const RenderProfiler = () => {
  const gl = useThree((state) => state.gl);
  const quality = useAquarium((state) => state.quality);
  const profile = useRef(new FrameProfile());
  const elapsed = useRef(0);
  const shadowMapSize = useRef(quality === 'low' ? 1024 : 2048);

  useEffect(() => {
    shadowMapSize.current = quality === 'low' ? 1024 : 2048;
    profile.current.reset();
    elapsed.current = 0;
    (window as ProfileWindow).__vibeRenderProfile = null;
  }, [quality]);

  useEffect(() => {
    const target = window as ProfileWindow;
    target.__vibeResetRenderProfile = () => {
      profile.current.reset();
      elapsed.current = 0;
      target.__vibeRenderProfile = null;
    };
    return () => {
      delete target.__vibeRenderProfile;
      delete target.__vibeResetRenderProfile;
    };
  }, []);

  useFrame((_, delta) => {
    profile.current.record(delta * 1000, gl.info.render.calls, gl.info.render.triangles);
    elapsed.current += delta;
    if (elapsed.current < 1) return;
    elapsed.current = 0;
    (window as ProfileWindow).__vibeRenderProfile = profile.current.snapshot(
      quality,
      shadowMapSize.current
    );
  });
  return null;
};
