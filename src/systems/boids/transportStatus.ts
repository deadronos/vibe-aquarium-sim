import type { VibeTransportStatus } from '../../declarations';

export function createTransportStatus(isolationSupported: boolean): VibeTransportStatus {
  return {
    mode: 'main-thread',
    isolationSupported,
    fishCapacity: 0,
    foodCapacity: 0,
    submitted: 0,
    completed: 0,
    errors: 0,
    overlapCount: 0,
    busy: false,
    latestReason: null,
  };
}

export function publishTransportStatus(status: VibeTransportStatus, busy: boolean): void {
  status.busy = busy;
  if (typeof window !== 'undefined') {
    window.__vibe_transportStatus = status;
    if (window.__vibe_debug) window.__vibe_debug.transport = status;
  }
}

export function recordTransportError(
  status: VibeTransportStatus,
  busy: boolean,
  reason: string
): void {
  status.errors += 1;
  status.latestReason = reason;
  publishTransportStatus(status, busy);
}
