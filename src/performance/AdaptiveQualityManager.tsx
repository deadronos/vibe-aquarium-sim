import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { getDeviceMaxDpr, nextHigherQuality, nextLowerQuality } from './qualityPresets';
import { getQualityProfile, type RendererBackend } from './qualityProfile';
import { applyQualityShadowMap } from './qualityShadow';
import { recordQualityTransition } from './qualityTelemetry';
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
    const backend: RendererBackend = isWebGPU ? 'webgpu' : 'webgl';
    const profile = getQualityProfile(level, backend, deviceMaxDprRef.current);
    const nextDpr = profile.dpr;

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
        lastAppliedShadowSizeRef.current !== profile.shadowMapSize
      ) {
        applyQualityShadowMap(directionalLightRef.current, profile.shadowMapSize, backend);
      }
    }

    if (spotLightRef?.current && !isWebGPU) {
      if (
        lastAppliedShadowSizeRef.current === null ||
        lastAppliedShadowSizeRef.current !== profile.shadowMapSize
      ) {
        applyQualityShadowMap(spotLightRef.current, profile.shadowMapSize, backend);
      }
    }

    lastAppliedShadowSizeRef.current = profile.shadowMapSize;
  }, [directionalLightRef, isWebGPU, level, setDpr, spotLightRef]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const backend: RendererBackend = isWebGPU ? 'webgpu' : 'webgl';
    const profile = getQualityProfile(level, backend, deviceMaxDprRef.current);
    const current = window.__vibe_qualityStatus;
    window.__vibe_qualityStatus = {
      backend,
      level,
      shadowMapSize: profile.shadowMapSize,
      causticsEnabled: profile.causticsEnabled,
      fishRimLightingEnabled: profile.fishRimLightingEnabled,
      fishSubsurfaceScatteringEnabled: profile.fishSubsurfaceScatteringEnabled,
      spotLightShadowsEnabled: profile.spotLightShadowsEnabled,
      tankTransmissionEnabled: profile.tankTransmissionEnabled,
      tankTransmissionDispersionEnabled: profile.tankTransmissionDispersionEnabled,
      stressMode: current?.stressMode,
      fishCount: current?.fishCount,
    };
  }, [isWebGPU, level]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') delete window.__vibe_qualityStatus;
    };
  }, []);

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
        recordQualityTransition({
          from: level,
          to: next,
          backend: isWebGPU ? 'webgpu' : 'webgl',
          ema,
          reason: 'low-fps',
        });
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
        const backend: RendererBackend = isWebGPU ? 'webgpu' : 'webgl';
        const nextProfile = getQualityProfile(next, backend, deviceMaxDpr);
        const currentProfile = getQualityProfile(level, backend, deviceMaxDpr);
        const dprDelta = nextProfile.dpr - currentProfile.dpr;

        if (dprDelta > 0.05 || nextProfile.shadowMapSize !== currentProfile.shadowMapSize) {
          applyLevelWithDeviceClamp(next);
          recordQualityTransition({
            from: level,
            to: next,
            backend,
            ema,
            reason: 'high-fps',
          });
          cooldownRef.current = COOLDOWN_SECONDS;
        } else {
          recordQualityTransition({
            from: level,
            to: next,
            backend,
            ema,
            reason: 'device-clamp',
          });
        }
      }
      return;
    }
  });

  return null;
};
