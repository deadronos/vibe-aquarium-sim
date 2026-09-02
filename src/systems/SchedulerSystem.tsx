import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { fixedScheduler } from '../utils/FixedStepScheduler';
import { useVisualQuality } from '../performance/VisualQualityContext';

export const SchedulerSystem = () => {
  const emaRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);
  const originalMaxRef = useRef<number | null>(null);
  const statusRef = useRef({ ema: 0, currentMax: 0, lastDuration: 0 });

  const { adaptiveSchedulerEnabled } = useVisualQuality();

  useEffect(() => {
    try {
      originalMaxRef.current = fixedScheduler.getMaxSubSteps();
    } catch {
      originalMaxRef.current = null;
    }
    return () => {
      // Ensure scheduler drops active throttling / accumulator states across unmounts
      fixedScheduler.reset();
    };
  }, []);

  useFrame((_, delta) => {
    const dbg = typeof window !== 'undefined' ? window.__vibe_debug : undefined;
    const pocEnabledFromWindow =
      typeof window !== 'undefined' ? window.__vibe_poc_enabled !== false : true;
    const pocEnabled = adaptiveSchedulerEnabled && pocEnabledFromWindow;
    // Timing is work for diagnostics or the adaptive scheduler policy only.
    // The ordinary fixed-step path should not read a clock every display frame.
    const timingEnabled = Boolean(dbg) || pocEnabled;
    const t0 = timingEnabled ? performance.now() : 0;
    const subSteps = fixedScheduler.update(delta);
    const dur = timingEnabled ? performance.now() - t0 : 0;

    if (timingEnabled) {
      // EMA is only useful to diagnostics or adaptive scheduling.
      const alpha = 0.06;
      emaRef.current = emaRef.current ? emaRef.current + (dur - emaRef.current) * alpha : dur;
    }

    // Thresholds for PoC
    const SCHED_EMA_THRESHOLD = 2.5; // ms
    const COOLDOWN_FRAMES = 120; // restore after this many frames

    try {
      if (dbg) {
        const scheduler = (dbg.scheduler ||= []);
        scheduler.push({ duration: dur, subSteps, time: Date.now(), ema: emaRef.current });

        const status = statusRef.current;
        status.ema = emaRef.current;
        status.currentMax = fixedScheduler.getMaxSubSteps();
        status.lastDuration = dur;
        window.__vibe_schedStatus = status;
      } else if (typeof window !== 'undefined' && window.__vibe_schedStatus) {
        // A HUD can be hidden while the simulation remains mounted.
        delete window.__vibe_schedStatus;
      }
    } catch {
      /* ignore */
    }

    // If EMA exceeds threshold and we have more than 1 substep allowed, reduce to 1 temporarily
    try {
      const currentMax = pocEnabled ? fixedScheduler.getMaxSubSteps() : 0;

      if (
        pocEnabled &&
        emaRef.current > SCHED_EMA_THRESHOLD &&
        currentMax > 1 &&
        cooldownRef.current === 0
      ) {
        // reduce
        if (originalMaxRef.current === null) originalMaxRef.current = currentMax;
        fixedScheduler.setMaxSubSteps(1);
        cooldownRef.current = COOLDOWN_FRAMES;
        // record
        try {
          const dbg = window.__vibe_debug;
          if (dbg)
            (dbg.schedulerTuning = dbg.schedulerTuning || []).push({
              time: Date.now(),
              action: 'reduce',
              from: currentMax,
              to: 1,
            });
        } catch {
          /* ignore */
        }
      }

      if (cooldownRef.current > 0) {
        cooldownRef.current -= 1;
        if (cooldownRef.current === 0 && originalMaxRef.current !== null) {
          fixedScheduler.setMaxSubSteps(originalMaxRef.current);
          try {
            const dbg = window.__vibe_debug;
            if (dbg)
              (dbg.schedulerTuning = dbg.schedulerTuning || []).push({
                time: Date.now(),
                action: 'restore',
                to: originalMaxRef.current,
              });
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
  });
  return null;
};
