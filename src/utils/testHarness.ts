import { Vector3 } from 'three';

/**
 * Test-only deterministic control surface for renderer parity/ghosting tests.
 *
 * Enabled exclusively through `?testHarness=1`; never referenced from the
 * production simulation path. It lets a browser test freeze the school and pin
 * individual fish to known poses so two backends can be compared frame-for-frame.
 */
export type VibeTestPose = { x: number; y: number; z: number };

export interface VibeTestHarness {
  enabled: true;
  frozen: boolean;
  frame: number;
  poses: Map<number, Vector3>;
  /** Optional constant-velocity script applied on top of `poses` while frozen. */
  motion: { velocity: Vector3; startFrame: number } | null;
  setFishPose: (index: number, x: number, y: number, z: number) => void;
  setAllPoses: (poses: readonly VibeTestPose[]) => void;
  clearPoses: () => void;
  freeze: () => void;
  unfreeze: () => void;
  startMotion: (vx: number, vy: number, vz: number, startFrame?: number) => void;
  stopMotion: () => void;
  waitForFrames: (count: number) => Promise<void>;
}

type FrameWaiter = { target: number; resolve: () => void };

const waiters: FrameWaiter[] = [];
let harness: VibeTestHarness | null = null;

export function isTestHarnessEnabled(
  search: string = typeof window !== 'undefined' ? window.location.search : ''
): boolean {
  return new URLSearchParams(search).get('testHarness') === '1';
}

export function getTestHarness(): VibeTestHarness | null {
  return harness;
}

export function installTestHarness(): VibeTestHarness {
  if (harness) return harness;

  const poses = new Map<number, Vector3>();

  const value: VibeTestHarness = {
    enabled: true,
    frozen: false,
    frame: 0,
    poses,
    motion: null,
    setFishPose(index, x, y, z) {
      poses.set(index, new Vector3(x, y, z));
    },
    setAllPoses(next) {
      poses.clear();
      for (let i = 0; i < next.length; i++) {
        const pose = next[i]!;
        poses.set(i, new Vector3(pose.x, pose.y, pose.z));
      }
    },
    clearPoses() {
      poses.clear();
    },
    freeze() {
      value.frozen = true;
    },
    unfreeze() {
      value.frozen = false;
    },
    startMotion(vx, vy, vz, startFrame = value.frame) {
      value.motion = { velocity: new Vector3(vx, vy, vz), startFrame };
    },
    stopMotion() {
      value.motion = null;
    },
    waitForFrames(count) {
      const target = value.frame + Math.max(1, Math.floor(count));
      return new Promise<void>((resolve) => {
        waiters.push({ target, resolve });
      });
    },
  };

  harness = value;
  (window as unknown as { __vibe_test?: VibeTestHarness }).__vibe_test = value;
  return value;
}

/** Advance the harness frame counter and resolve any frame waiters. */
export function tickTestHarnessFrame(): void {
  if (!harness) return;
  harness.frame++;
  for (let i = waiters.length - 1; i >= 0; i--) {
    if (harness.frame >= waiters[i]!.target) {
      waiters.splice(i, 1)[0]!.resolve();
    }
  }
}

/** Test-only teardown so re-mounts do not leak closures between specs. */
export function resetTestHarness(): void {
  waiters.length = 0;
  harness = null;
  if (typeof window !== 'undefined') {
    delete (window as unknown as { __vibe_test?: VibeTestHarness }).__vibe_test;
  }
}
