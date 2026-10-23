import { useGLTF } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import { useAquarium } from '../../state/store';
import { ErrorBoundary } from '../ErrorBoundary';
import { FISH_URLS } from './assets';
import { FishView } from './FishView';

/** How long the fish models may take to download before the HUD offers a retry. */
const LOAD_TIMEOUT_MS = 25_000;

/** Drops cached (failed or stalled) requests so the next attempt fetches the models again. */
const forgetFishModels = () => useGLTF.clear(FISH_URLS);

/** Suspense fallback: mounted only while the models download, so its timer covers just that. */
const LoadTimeout = () => {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      forgetFishModels();
      useAquarium.getState().setLoadError('timeout');
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
};

const onFishError = () => {
  forgetFishModels();
  useAquarium.getState().setLoadError('assets');
};

/** The fish, with their download guarded: a failure or stall reaches the HUD, Retry remounts. */
export const FishLoader = () => {
  const attempt = useAquarium((state) => state.loadAttempt);
  return (
    <ErrorBoundary key={attempt} onError={onFishError}>
      <Suspense fallback={<LoadTimeout />}>
        <FishView />
      </Suspense>
    </ErrorBoundary>
  );
};
