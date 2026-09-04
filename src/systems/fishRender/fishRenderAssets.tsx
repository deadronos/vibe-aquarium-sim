import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import type { MutableRefObject } from 'react';
import type { InstancedMesh } from 'three';
import { MODEL_URLS } from '../fishModels';
import { FishModelErrorBoundary, FishModelMesh } from '../FishModelMesh';
import type { VibeFishLightingUniforms } from '../../shaders/fishLightingMaterial';

export const OPTIONAL_FISH_MODEL_TIMEOUT_MS = 15_000;

export type DeferredFishModelProps = {
  modelIndex: 1 | 2;
  meshRef: MutableRefObject<InstancedMesh | null>;
  uniformsRef: MutableRefObject<VibeFishLightingUniforms[]>;
  fishRimLightingEnabled: boolean;
  fishSubsurfaceScatteringEnabled: boolean;
  isWebGPU: boolean;
  onReady: () => void;
};

export const DeferredFishModel = ({ modelIndex, ...props }: DeferredFishModelProps) => {
  const gltf = useGLTF(MODEL_URLS[modelIndex]);
  return <FishModelMesh modelIndex={modelIndex} gltf={gltf} {...props} />;
};

export type DeferredFishModelSlotProps = DeferredFishModelProps & { onError: () => void };

/**
 * Optional variants must never hold the Suspense tree in a permanent loading
 * state. The slot itself stays outside the boundary so its timeout effect can
 * run while the loader is suspended; the primary model remains authoritative.
 */
export const DeferredFishModelSlot = ({
  onError,
  onReady,
  ...props
}: DeferredFishModelSlotProps) => {
  const [timedOut, setTimedOut] = useState(false);
  const settledRef = useRef(false);
  const handleReady = useCallback(() => {
    settledRef.current = true;
    onReady();
  }, [onReady]);
  const handleError = useCallback(() => {
    settledRef.current = true;
    onError();
  }, [onError]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      onError();
      setTimedOut(true);
    }, OPTIONAL_FISH_MODEL_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onError]);

  if (timedOut) return null;
  return (
    <Suspense fallback={null}>
      <FishModelErrorBoundary modelIndex={props.modelIndex} onError={handleError}>
        <DeferredFishModel {...props} onReady={handleReady} />
      </FishModelErrorBoundary>
    </Suspense>
  );
};
