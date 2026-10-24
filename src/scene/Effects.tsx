import {
  Bloom,
  DepthOfField,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import type { DepthOfFieldEffect, EffectComposer as Composer } from 'postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Fragment, useLayoutEffect, useRef } from 'react';
import { disposeDeep, release, retain } from './dispose';
import { useReducedMotion } from '../state/motion';
import { focus } from './focus';

/**
 * High-quality post stack: focus on what the camera looks at, soft bloom, filmic tone mapping.
 * Depth of field, whose focus pulls as the camera moves, is left out under reduced motion.
 */
export const Effects = () => {
  const dof = useRef<DepthOfFieldEffect>(null);
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
  useFrame((_, delta) => {
    const effect = dof.current;
    if (!effect?.target) return;
    effect.target.lerp(focus.point, Math.min(1, delta * 6));
    const k = Math.min(1, delta * 3);
    effect.cocMaterial.focusRange += (focus.range - effect.cocMaterial.focusRange) * k;
    effect.bokehScale += (focus.bokeh - effect.bokehScale) * k;
  });
  return (
    <EffectComposer ref={composer} multisampling={4}>
      {/* EffectComposer only takes elements, so an empty Fragment stands in for no DoF. */}
      {reducedMotion ? (
        <Fragment />
      ) : (
        <DepthOfField ref={dof} target={[0, 1, -2]} focusRange={2} bokehScale={1.5} />
      )}
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={0.6} />
      <Vignette offset={0.32} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  );
};
