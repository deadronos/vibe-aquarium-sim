import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import {
  getDeviceMaxDpr,
  nextHigherQuality,
  nextLowerQuality,
  getQualitySettings,
} from './qualityPresets';
import { useQualityStore } from './qualityStore';
import { useVisualQuality } from './VisualQualityContext';

const DISREGARD_DELTA_OVER_SECONDS = 0.2; // ignore tab-switch / hitch deltas

const TARGET_FPS = 60;
const DOWNGRADE_FPS = 52;
const UPGRADE_FPS = 58;

const UPDATE_INTERVAL_SECONDS = 0.75;
const COOLDOWN_SECONDS = 2.5;

const EMA_ALPHA = 0.06;

export interface AdaptiveQualityManagerProps {
  directionalLightRef?: RefObject<THREE.DirectionalLight | null>;
  spotLightRef?: RefObject<THREE.SpotLight | null>;
}

/**
 * Apply a shadow map size to a light, but only when the size actually changed.
 * This is a one-time resize triggered by quality-level changes (useEffect),
 * NOT per-frame. Per-frame dynamic resizing would crash WebGPU with
 * "Destroyed texture used in a submit". This deferred approach is safe for
 * both WebGL and WebGPU backends.
 *
 * IMPORTANT: We do NOT manually dispose the old shadow map. Three.js handles
 * RenderTarget disposal and recreation internally when `needsUpdate` is true.
 * Manual disposal causes "Destroyed texture used in a submit" on WebGPU
 * because the GPU command buffer may still reference the texture.
 */
const applyShadowMapSize = (
  light: THREE.DirectionalLight | THREE.SpotLight | null | undefined,
  targetSize: number
): void => {
  if (!light?.shadow) return;
  const current = light.shadow.mapSize;
  if (current.width === targetSize && current.height === targetSize) return;

  light.shadow.mapSize.set(targetSize, targetSize);
  // Let Three.js handle the RenderTarget lifecycle — it will dispose the old
  // shadow map and create a new one with the updated dimensions during the
  // next shadow render pass.
  light.shadow.needsUpdate = true;
};

export const AdaptiveQualityManager = ({
  directionalLightRef,
  spotLightRef,
}: AdaptiveQualityManagerProps) => {
  const setDpr = useThree((s) => s.setDpr);

  const isAdaptiveEnabled = useQualityStore((s) => s.isAdaptiveEnabled);
  const level = useQualityStore((s) => s.level);
  const applyLevelWithDeviceClamp = useQualityStore((s) => s.applyLevelWithDeviceClamp);
  const setFpsEma = useQualityStore((s) => s.setFpsEma);

  // On WebGPU, shadow map resizing triggers a Three.js internal dispose of the
  // old depth texture, which causes "Destroyed texture used in a submit".
  // Shadow map size is fixed at the initial JSX-configured value on WebGPU.
  const { isWebGPU } = useVisualQuality();

  const deviceMaxDprRef = useRef(getDeviceMaxDpr());

  const emaFpsRef = useRef(TARGET_FPS);
  const intervalAccRef = useRef(0);
  const cooldownRef = useRef(0);
  const stableLowCountRef = useRef(0);
  const stableHighCountRef = useRef(0);

  const lastAppliedDprRef = useRef<number | null>(null);
  const lastAppliedShadowSizeRef = useRef<number | null>(null);

  useEffect(() => {
    // Device pixel ratio can change (zoom / moving window between displays).
    // Refresh occasionally by piggybacking on rerenders of this component.
    deviceMaxDprRef.current = getDeviceMaxDpr();
  });

  useEffect(() => {
    const settings = getQualitySettings(level, deviceMaxDprRef.current);
    const nextDpr = settings.dpr;

    if (
      lastAppliedDprRef.current === null ||
      Math.abs(lastAppliedDprRef.current - nextDpr) > 0.01
    ) {
      setDpr(nextDpr);
      lastAppliedDprRef.current = nextDpr;
    }

    if (directionalLightRef?.current && !isWebGPU) {
      if (
        lastAppliedShadowSizeRef.current === null ||
        lastAppliedShadowSizeRef.current !== settings.shadowMapSize
      ) {
        applyShadowMapSize(directionalLightRef.current, settings.shadowMapSize);
      }
    }

    if (spotLightRef?.current && !isWebGPU) {
      if (
        lastAppliedShadowSizeRef.current === null ||
        lastAppliedShadowSizeRef.current !== settings.shadowMapSize
      ) {
        applyShadowMapSize(spotLightRef.current, settings.shadowMapSize);
      }
    }

    lastAppliedShadowSizeRef.current = settings.shadowMapSize;
  }, [directionalLightRef, isWebGPU, level, setDpr, spotLightRef]);

  useFrame((_, delta) => {
    if (!isAdaptiveEnabled) return;

    if (delta <= 0 || delta > DISREGARD_DELTA_OVER_SECONDS) return;

    const fps = 1 / delta;
    const ema = emaFpsRef.current + (fps - emaFpsRef.current) * EMA_ALPHA;
    emaFpsRef.current = ema;

    intervalAccRef.current += delta;
    cooldownRef.current = Math.max(0, cooldownRef.current - delta);

    if (intervalAccRef.current < UPDATE_INTERVAL_SECONDS) return;
    intervalAccRef.current = 0;

    // Push to UI/store at a low cadence to avoid rerender churn.
    setFpsEma(ema);

    if (cooldownRef.current > 0) return;

    const lowThreshold = DOWNGRADE_FPS;
    const highThreshold = UPGRADE_FPS;

    if (ema < lowThreshold) {
      stableLowCountRef.current++;
      stableHighCountRef.current = 0;
    } else if (ema > highThreshold) {
      stableHighCountRef.current++;
      stableLowCountRef.current = 0;
    } else {
      stableLowCountRef.current = 0;
      stableHighCountRef.current = 0;
    }

    // Require stability over multiple intervals (hysteresis + debounce).
    // Degrade faster than we upgrade.
    const shouldDegrade = stableLowCountRef.current >= 2;
    const shouldUpgrade = stableHighCountRef.current >= 4;

    if (shouldDegrade) {
      stableLowCountRef.current = 0;
      const next = nextLowerQuality(level);
      if (next !== level) {
        applyLevelWithDeviceClamp(next);
        cooldownRef.current = COOLDOWN_SECONDS;
      }
      return;
    }

    if (shouldUpgrade) {
      stableHighCountRef.current = 0;
      const next = nextHigherQuality(level);
      if (next !== level) {
        // Avoid upgrading beyond what the device DPR makes meaningful.
        const deviceMaxDpr = deviceMaxDprRef.current;
        const nextSettings = getQualitySettings(next, deviceMaxDpr);
        const currentSettings = getQualitySettings(level, deviceMaxDpr);
        const dprDelta = nextSettings.dpr - currentSettings.dpr;

        if (dprDelta > 0.05 || nextSettings.shadowMapSize !== currentSettings.shadowMapSize) {
          applyLevelWithDeviceClamp(next);
          cooldownRef.current = COOLDOWN_SECONDS;
        }
      }
      return;
    }
  });

  return null;
};
