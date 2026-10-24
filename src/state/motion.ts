import { useSyncExternalStore } from 'react';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type MotionQuery = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;

/**
 * The visitor's reduced-motion preference, read from a media query. Without `matchMedia` (tests,
 * server) motion is never reduced.
 */
export const createMotionPreference = (matchMedia?: (query: string) => MotionQuery) => {
  const query = matchMedia?.(REDUCED_MOTION_QUERY) ?? null;
  return {
    reduced: () => query?.matches ?? false,
    subscribe: (listener: () => void) => {
      query?.addEventListener('change', listener);
      return () => query?.removeEventListener('change', listener);
    },
  };
};

const motion = createMotionPreference(
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? (query) => window.matchMedia(query)
    : undefined
);

/**
 * The one source for reduced motion. Frame loops and event handlers call this (it allocates
 * nothing); components use `useReducedMotion` to re-render when the preference changes.
 */
export const prefersReducedMotion = motion.reduced;

export const subscribeReducedMotion = motion.subscribe;

export const useReducedMotion = () =>
  useSyncExternalStore(motion.subscribe, motion.reduced, () => false);
