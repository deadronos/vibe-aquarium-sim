export function ensurePerfDebug() {
  if (typeof window === 'undefined') return null;
  const w = window;
  if (!w.__vibe_debug) {
    w.__vibe_debug = {
      simulateStep: [] as Array<{ duration: number; time: number; fishCount: number }>,
      fishRender: [] as Array<{
        frame: number;
        duration: number;
        counts: { countA: number; countB: number; countC: number };
        activeEntities: number;
      }>,
      fishUseFrame: [] as Array<{ duration: number; modelIndex: number | null }>,
      qualityTransitions: [] as VibeQualityTransitionEntry[],
      transport: null as VibeTransportStatus | null,
      reset() {
        this.simulateStep.length = 0;
        this.fishRender.length = 0;
        this.fishUseFrame.length = 0;
        this.qualityTransitions?.splice(0, this.qualityTransitions.length);
      },
      download() {
        try {
          const payload = {
            meta: { collectedAt: new Date().toISOString() },
            simulateStep: this.simulateStep.slice(),
            fishRender: this.fishRender.slice(),
            fishUseFrame: this.fishUseFrame.slice(),
            qualityTransitions: this.qualityTransitions?.slice() ?? [],
            transport: this.transport ?? null,
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `vibe-trace-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return true;
        } catch {
          // ignore
          return false;
        }
      },
    };
  }
  return w.__vibe_debug;
}
