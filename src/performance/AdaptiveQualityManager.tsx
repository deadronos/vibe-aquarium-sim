import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import {
  getDeviceMaxDpr,
  nextHigherQuality,
  nextLowerQuality,
  getQualitySettings,
  clampShadowMapSize,
} from './qualityPresets';
import { useQualityStore } from './qualityStore';

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

const updateShadowMapSize = (light: THREE.Light, size: number) => {
  const anyLight = light as unknown as {
    shadow?: {
      mapSize: { set: (w: number, h: number) => void };
      map?: { dispose: () => void } | null;
      needsUpdate: boolean;
    };
  };

  if (!anyLight.shadow) return;

  const clamped = clampShadowMapSize(size);
  anyLight.shadow.mapSize.set(clamped, clamped);

  if (anyLight.shadow.map) {
    anyLight.shadow.map.dispose();
    anyLight.shadow.map = null;
  }

  anyLight.shadow.needsUpdate = true;
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

    if (directionalLightRef?.current) {
      if (
        lastAppliedShadowSizeRef.current === null ||
        lastAppliedShadowSizeRef.current !== settings.shadowMapSize
      ) {
        updateShadowMapSize(directionalLightRef.current, settings.shadowMapSize);
      }
    }

    if (spotLightRef?.current) {
      if (
        lastAppliedShadowSizeRef.current === null ||
        lastAppliedShadowSizeRef.current !== settings.shadowMapSize
      ) {
        updateShadowMapSize(spotLightRef.current, settings.shadowMapSize);
      }
    }

    lastAppliedShadowSizeRef.current = settings.shadowMapSize;
  }, [directionalLightRef, level, setDpr, spotLightRef]);

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
