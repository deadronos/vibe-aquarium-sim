import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ambience } from '../src/audio/ambience';

/** A param that records its automation calls. */
const param = (value = 0) => ({
  value,
  calls: [] as [string, ...number[]][],
  setTargetAtTime(...args: number[]) {
    this.calls.push(['target', ...args]);
  },
  cancelScheduledValues(...args: number[]) {
    this.calls.push(['cancel', ...args]);
  },
  setValueAtTime(...args: number[]) {
    this.calls.push(['set', ...args]);
  },
  linearRampToValueAtTime(...args: number[]) {
    this.calls.push(['linear', ...args]);
  },
  exponentialRampToValueAtTime(...args: number[]) {
    this.calls.push(['exp', ...args]);
  },
});

type FakeNode = Record<string, unknown> & { kind: string; connections: unknown[] };

/** Just enough of the WebAudio graph API to build the soundscape and inspect it. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  sampleRate = 8000;
  currentTime = 1;
  destination = { kind: 'destination' };
  nodes: FakeNode[] = [];
  resume = vi.fn(() => Promise.resolve());
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  private node(kind: string, extra: Record<string, unknown>): FakeNode {
    const node: FakeNode = {
      kind,
      connections: [],
      connect: (target: unknown) => (node.connections.push(target), target),
      start: vi.fn(),
      stop: vi.fn(),
      ...extra,
    };
    this.nodes.push(node);
    return node;
  }
  createGain() {
    return this.node('gain', { gain: param(1) });
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  }
  createBufferSource() {
    return this.node('source', { playbackRate: param(1) });
  }
  createBiquadFilter() {
    return this.node('filter', { frequency: param(), Q: param() });
  }
  createOscillator() {
    return this.node('oscillator', { frequency: param() });
  }
}

describe('ambience', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('window', globalThis);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const master = (context: FakeAudioContext) =>
    context.nodes.find((n) => n.connections[0] === context.destination)! as FakeNode & {
      gain: ReturnType<typeof param>;
    };

  it('builds nothing until started', () => {
    const ambience = new Ambience();
    ambience.stop();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it('builds the graph once, silent, and fades in on start', () => {
    const ambience = new Ambience();
    ambience.start();
    const [context] = FakeAudioContext.instances;
    expect(context!.resume).toHaveBeenCalledOnce();
    const out = master(context!);
    expect(out.gain.value).toBe(0);
    expect(out.gain.calls).toEqual([
      ['cancel', 1],
      ['target', 0.5, 1, 0.8],
    ]);
    // Hum, trickle and the trickle's wobble all run continuously.
    const running = context!.nodes.filter(
      (n) => (n.start as ReturnType<typeof vi.fn>).mock.calls.length
    );
    expect(running.map((n) => n.kind).sort()).toEqual(['oscillator', 'source', 'source']);

    ambience.stop();
    ambience.start();
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(context!.resume).toHaveBeenCalledTimes(2);
  });

  it('fills a looping noise buffer with bounded brown noise', () => {
    new Ambience().start();
    const [context] = FakeAudioContext.instances;
    const source = context!.nodes.find((n) => n.kind === 'source')!;
    expect(source.loop).toBe(true);
    const data = (source.buffer as { getChannelData: () => Float32Array }).getChannelData();
    expect(data.length).toBe(8000 * 4);
    expect(data.some((v) => v !== 0)).toBe(true);
    for (const v of data) expect(Math.abs(v)).toBeLessThan(1);
  });

  it('pops bubbles while playing and stops them on stop', () => {
    const ambience = new Ambience();
    ambience.start();
    const [context] = FakeAudioContext.instances;
    const before = context!.nodes.length;
    vi.advanceTimersByTime(399);
    expect(context!.nodes.length).toBe(before);
    vi.advanceTimersByTime(1);
    expect(context!.nodes.length).toBe(before + 2); // an oscillator and its envelope
    const bubble = context!.nodes[before]!;
    expect(bubble.connections[0]).toBe(context!.nodes[before + 1]);
    expect(context!.nodes[before + 1]!.connections[0]).toBe(master(context!));
    expect(bubble.stop).toHaveBeenCalledWith(1.1);

    vi.advanceTimersByTime(2000);
    const playing = context!.nodes.length;
    expect(playing).toBeGreaterThan(before + 2);

    ambience.stop();
    expect(master(context!).gain.calls.at(-1)).toEqual(['target', 0, 1, 0.4]);
    vi.advanceTimersByTime(10000);
    expect(context!.nodes.length).toBe(playing);
  });

  it('does not stack bubble timers when started twice', () => {
    const ambience = new Ambience();
    ambience.start();
    ambience.start();
    const [context] = FakeAudioContext.instances;
    const before = context!.nodes.length;
    vi.advanceTimersByTime(400);
    expect(context!.nodes.length).toBe(before + 2);
  });
});
