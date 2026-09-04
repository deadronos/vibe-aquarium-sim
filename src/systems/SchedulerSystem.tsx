import { useFrame } from '@react-three/fiber';
import { useBeforePhysicsStep } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import { fixedScheduler } from '../utils/FixedStepScheduler';
import { useVisualQuality } from '../performance/VisualQualityContext';

export const SchedulerSystem = () => {
  const emaRef = useRef<number>(0);
  const statusRef = useRef({ ema: 0, fixedStepHz: 60, lastDuration: 0 });

  const { adaptiveSchedulerEnabled } = useVisualQuality();

  useEffect(() => {
    return () => {
      // Ensure scheduler drops any accumulated state across unmounts.
      fixedScheduler.reset();
    };
  }, []);

  useBeforePhysicsStep(() => {
    const dbg = typeof window !== 'undefined' ? window.__vibe_debug : undefined;
    const pocEnabledFromWindow =
      typeof window !== 'undefined' ? window.__vibe_poc_enabled !== false : true;
    const pocEnabled = adaptiveSchedulerEnabled && pocEnabledFromWindow;
    // Timing is work for diagnostics or opt-in scheduler telemetry only.
    // The ordinary fixed-step path should not read a clock every display frame.
    const telemetryEnabled = Boolean(dbg) || pocEnabled;
    const timingEnabled = telemetryEnabled;
    const t0 = timingEnabled ? performance.now() : 0;
    const subSteps = fixedScheduler.step();
    const dur = timingEnabled ? performance.now() - t0 : 0;
    statusRef.current.lastDuration = dur;

    if (timingEnabled) {
      // EMA is only useful to diagnostics or adaptive scheduling.
      const alpha = 0.06;
      emaRef.current = emaRef.current ? emaRef.current + (dur - emaRef.current) * alpha : dur;
    }

    try {
      if (dbg) {
        const scheduler = (dbg.scheduler ||= []);
        scheduler.push({ duration: dur, subSteps, time: Date.now(), ema: emaRef.current });
      }

      if (typeof window !== 'undefined' && telemetryEnabled) {
        const status = statusRef.current;
        status.ema = emaRef.current;
        status.fixedStepHz = 60;
        status.lastDuration = dur;
        window.__vibe_schedStatus = status;
      }
    } catch {
      /* ignore */
    }
  });

  useFrame(() => {
    const dbg = typeof window !== 'undefined' ? window.__vibe_debug : undefined;
    const pocEnabledFromWindow =
      typeof window !== 'undefined' ? window.__vibe_poc_enabled !== false : true;
    const pocEnabled = adaptiveSchedulerEnabled && pocEnabledFromWindow;
    const telemetryEnabled = Boolean(dbg) || pocEnabled;

    try {
      if (typeof window !== 'undefined' && telemetryEnabled) {
        const status = statusRef.current;
        status.ema = emaRef.current;
        status.fixedStepHz = 60;
        status.lastDuration = statusRef.current.lastDuration;
        window.__vibe_schedStatus = status;
      } else if (typeof window !== 'undefined' && window.__vibe_schedStatus) {
        // A HUD can be hidden while the simulation remains mounted.
        delete window.__vibe_schedStatus;
      }
    } catch {
      /* ignore */
    }
  });
  return null;
};
