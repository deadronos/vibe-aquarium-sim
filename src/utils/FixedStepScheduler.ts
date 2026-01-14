export type Callback = (fixedDelta: number) => void;

export class FixedStepScheduler {
  private accumulator = 0;
  private readonly fixedStep: number;
  private maxSubSteps: number;
  private callbacks: Set<Callback> = new Set();

  constructor(fixedStep = 1 / 60, maxSubSteps = 5) {
    this.fixedStep = fixedStep;
    this.maxSubSteps = maxSubSteps;
  }

  // PoC: allow dynamic tuning of max sub-steps
  setMaxSubSteps(n: number) {
    this.maxSubSteps = Math.max(1, Math.floor(n));
  }

  getMaxSubSteps() {
    return this.maxSubSteps;
  }

  add(callback: Callback) {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  update(delta: number) {
    this.accumulator += delta;
    let subSteps = 0;
    while (this.accumulator >= this.fixedStep && subSteps < this.maxSubSteps) {
      for (const cb of this.callbacks) {
        cb(this.fixedStep);
      }
      this.accumulator -= this.fixedStep;
      subSteps++;
    }
    // Prevent spiraling if we hit maxSubSteps by clamping accumulator
    if (this.accumulator > this.fixedStep * this.maxSubSteps) {
      this.accumulator = 0;
    }
    return subSteps;
  }

  get alpha() {
    return this.accumulator / this.fixedStep;
  }
}

export const fixedScheduler = new FixedStepScheduler();
