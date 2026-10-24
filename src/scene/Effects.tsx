import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import type { EffectComposer as Composer } from 'postprocessing';
import { DepthOfFieldEffect, ToneMappingMode } from 'postprocessing';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { disposeDeep, release, retain } from './dispose';
import { useReducedMotion } from '../state/motion';
import { focus } from './focus';

/**
 * Depth of field with every pass at half the composer's size. The library already halves its
 * blur and near-field targets, but runs circle of confusion, masking and the far bokeh at full
 * size; the blur reads as well from half-size buffers.
 */
class HalfResDepthOfField extends DepthOfFieldEffect {
  /** The base resize re-enters `setSize` with the halved size, which must not halve again. */
  private resizing = false;

  override setSize(width: number, height: number) {
    if (this.resizing) {
      super.setSize(width, height);
      return;
    }
    this.resizing = true;
    try {
      super.setSize(Math.max(1, Math.round(width / 2)), Math.max(1, Math.round(height / 2)));
    } finally {
      this.resizing = false;
    }
  }
}

/** Half-size depth of field whose focus starts on a fixed point and then pulls toward `focus`. */
const DepthOfField = () => {
  const camera = useThree((state) => state.camera);
  // resolutionScale 1: the half size above is the whole reduction.
  const effect = useMemo(() => {
    const dof = new HalfResDepthOfField(camera, {
      focusRange: 2,
      bokehScale: 1.5,
      resolutionScale: 1,
    });
    dof.target = new THREE.Vector3(0, 1, -2);
    return dof;
  }, [camera]);
  useEffect(() => {
    retain(effect);
    return () => release(effect, () => effect.dispose());
  }, [effect]);
  useFrame((_, delta) => {
    if (!effect.target) return;
    effect.target.lerp(focus.point, Math.min(1, delta * 6));
    const k = Math.min(1, delta * 3);
    effect.cocMaterial.focusRange += (focus.range - effect.cocMaterial.focusRange) * k;
    effect.bokehScale += (focus.bokeh - effect.bokehScale) * k;
  });
  return <primitive object={effect} />;
};

/**
 * High-quality post stack: focus on what the camera looks at, soft bloom, filmic tone mapping.
 * Depth of field, whose focus pulls as the camera moves, is left out on the middle quality step
 * and under reduced motion.
 */
export const Effects = ({ depthOfField = true }: { depthOfField?: boolean }) => {
  const composer = useRef<Composer>(null);
  // The library never disposes its composer. A layout cleanup here runs before the composer's
  // own, which removes the effect passes without disposing them, so take the passes first.
  useLayoutEffect(() => {
    const current = composer.current;
    if (!current) return;
    retain(current);
    return () => {
      const passes = [...current.passes];
      release(current, () => {
        disposeDeep(passes);
        current.dispose();
      });
    };
  }, []);
  const reducedMotion = useReducedMotion();
  return (
    <EffectComposer ref={composer} multisampling={2}>
      {/* EffectComposer only takes elements, so an empty Fragment stands in for no DoF. */}
      {depthOfField && !reducedMotion ? <DepthOfField /> : <Fragment />}
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={0.6} />
      <Vignette offset={0.32} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  );
};
