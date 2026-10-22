/**
 * Procedural room-and-tank soundscape: the low hum of a filter, a soft water trickle and the odd
 * bubble. Generated with WebAudio, so nothing is downloaded.
 */
export class Ambience {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private bubbleTimer: number | null = null;

  start() {
    if (!this.context) this.build();
    const { context, master } = this;
    void context!.resume();
    master!.gain.cancelScheduledValues(context!.currentTime);
    master!.gain.setTargetAtTime(0.5, context!.currentTime, 0.8);
    this.scheduleBubble();
  }

  stop() {
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.4);
    if (this.bubbleTimer !== null) window.clearTimeout(this.bubbleTimer);
    this.bubbleTimer = null;
  }

  private build() {
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    const seconds = 4;
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // Brown noise: integrated white noise.
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }

    const hum = context.createBufferSource();
    hum.buffer = buffer;
    hum.loop = true;
    const humFilter = context.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 320;
    const humGain = context.createGain();
    humGain.gain.value = 0.35;
    hum.connect(humFilter).connect(humGain).connect(master);
    hum.start();

    const trickle = context.createBufferSource();
    trickle.buffer = buffer;
    trickle.loop = true;
    trickle.playbackRate.value = 3.1;
    const trickleFilter = context.createBiquadFilter();
    trickleFilter.type = 'bandpass';
    trickleFilter.frequency.value = 1400;
    trickleFilter.Q.value = 0.8;
    const trickleGain = context.createGain();
    trickleGain.gain.value = 0.12;
    const wobble = context.createOscillator();
    wobble.frequency.value = 0.21;
    const wobbleDepth = context.createGain();
    wobbleDepth.gain.value = 0.05;
    wobble.connect(wobbleDepth).connect(trickleGain.gain);
    wobble.start();
    trickle.connect(trickleFilter).connect(trickleGain).connect(master);
    trickle.start();

    this.context = context;
    this.master = master;
  }

  private scheduleBubble() {
    if (this.bubbleTimer !== null) return;
    const tick = () => {
      this.bubble();
      this.bubbleTimer = window.setTimeout(tick, 250 + Math.random() * 1600);
    };
    this.bubbleTimer = window.setTimeout(tick, 400);
  }

  private bubble() {
    const { context, master } = this;
    if (!context || !master) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const base = 500 + Math.random() * 700;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 2.2, now + 0.06);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.025 + Math.random() * 0.02, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}
