import { describe, expect, it } from 'vitest';
import { REDUCED_MOTION_QUERY, createMotionPreference } from '../src/state/motion';

const fakeQuery = (matches: boolean) => {
  const listeners = new Set<() => void>();
  const query = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    change(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
    listeners,
  };
  return query;
};

describe('reduced motion preference', () => {
  it('reads the prefers-reduced-motion media query', () => {
    const asked: string[] = [];
    const query = fakeQuery(true);
    const motion = createMotionPreference((q) => {
      asked.push(q);
      return query as unknown as MediaQueryList;
    });
    expect(asked).toEqual([REDUCED_MOTION_QUERY]);
    expect(motion.reduced()).toBe(true);
  });

  it('follows changes and stops notifying once unsubscribed', () => {
    const query = fakeQuery(false);
    const motion = createMotionPreference(() => query as unknown as MediaQueryList);
    let calls = 0;
    const unsubscribe = motion.subscribe(() => calls++);
    query.change(true);
    expect(motion.reduced()).toBe(true);
    expect(calls).toBe(1);
    unsubscribe();
    expect(query.listeners.size).toBe(0);
    query.change(false);
    expect(motion.reduced()).toBe(false);
    expect(calls).toBe(1);
  });

  it('never reduces motion without matchMedia', () => {
    const motion = createMotionPreference();
    expect(motion.reduced()).toBe(false);
    expect(() => motion.subscribe(() => {})()).not.toThrow();
  });
});
