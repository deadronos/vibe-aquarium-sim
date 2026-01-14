import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { fixedScheduler } from '../utils/FixedStepScheduler';

export const SchedulerSystem = () => {
  const emaRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);
  const originalMaxRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      originalMaxRef.current = fixedScheduler.getMaxSubSteps();
    } catch (e) {
      originalMaxRef.current = null;
    }
  }, []);

  useFrame((_, delta) => {
    const t0 = performance.now();
    const subSteps = fixedScheduler.update(delta);
    const t1 = performance.now();

    const dur = t1 - t0;
    // EMA and adaptive logic
    const alpha = 0.06;
    emaRef.current = emaRef.current ? emaRef.current + (dur - emaRef.current) * alpha : dur;

    // Thresholds for PoC
    const SCHED_EMA_THRESHOLD = 2.5; // ms
    const COOLDOWN_FRAMES = 120; // restore after this many frames

    try {
      const dbg = (window as any).__vibe_debug;
      if (dbg) dbg.scheduler = dbg.scheduler || [];
      if (dbg) dbg.scheduler.push({ duration: dur, subSteps, time: Date.now(), ema: emaRef.current });

      // Publish lightweight status
      try {
        (window as any).__vibe_schedStatus = { ema: emaRef.current, currentMax: fixedScheduler.getMaxSubSteps(), lastDuration: dur };
      } catch (err) {
        /* ignore */
      }
    } catch (e) {
      /* ignore */
    }

    // If EMA exceeds threshold and we have more than 1 substep allowed, reduce to 1 temporarily
    try {
      const currentMax = fixedScheduler.getMaxSubSteps();
      if (emaRef.current > SCHED_EMA_THRESHOLD && currentMax > 1 && cooldownRef.current === 0) {
        // reduce
        if (originalMaxRef.current === null) originalMaxRef.current = currentMax;
        fixedScheduler.setMaxSubSteps(1);
        cooldownRef.current = COOLDOWN_FRAMES;
        // record
        try { const dbg = (window as any).__vibe_debug; if (dbg) (dbg.schedulerTuning = dbg.schedulerTuning||[]).push({ time: Date.now(), action: 'reduce', from: currentMax, to: 1 }); } catch(e){}
      }

      if (cooldownRef.current > 0) {
        cooldownRef.current -= 1;
        if (cooldownRef.current === 0 && originalMaxRef.current !== null) {
          fixedScheduler.setMaxSubSteps(originalMaxRef.current);
          try { const dbg = (window as any).__vibe_debug; if (dbg) (dbg.schedulerTuning = dbg.schedulerTuning||[]).push({ time: Date.now(), action: 'restore', to: originalMaxRef.current }); } catch(e){}
        }
      }
    } catch (e) {
      /* ignore */
    }
  });
  return null;
};
