export const ROOM_REFLECTION_INTERVAL_SECONDS = 5;

let prepareRoomReflectionCallback: (() => Promise<void>) | null = null;

export const registerRoomReflectionPreparation = (prepare: () => Promise<void>) => {
  prepareRoomReflectionCallback = prepare;
  return () => {
    if (prepareRoomReflectionCallback === prepare) prepareRoomReflectionCallback = null;
  };
};

export const prepareRoomReflection = async () => {
  await prepareRoomReflectionCallback?.();
};

interface ReflectionLighting {
  sunDirection: { x: number; y: number; z: number };
  sunIntensity: number;
  skyTop: { r: number; g: number; b: number };
  skyHorizon: { r: number; g: number; b: number };
  ambientIntensity: number;
  lamp: number;
}

/** Fixed-signature scheduler for infrequent room cubemap updates. */
export class RoomReflectionSchedule {
  private captured = false;
  private capturedAt = 0;
  private sunX = 0;
  private sunY = 0;
  private sunZ = 0;
  private sunIntensity = 0;
  private skyTopR = 0;
  private skyTopG = 0;
  private skyTopB = 0;
  private skyHorizonR = 0;
  private skyHorizonG = 0;
  private skyHorizonB = 0;
  private ambientIntensity = 0;
  private lamp = 0;

  needsCapture(now: number, lighting: ReflectionLighting, ready = true) {
    if (!ready) return false;
    if (!this.captured) return true;
    if (now - this.capturedAt < ROOM_REFLECTION_INTERVAL_SECONDS) return false;

    const direction = lighting.sunDirection;
    const dx = direction.x - this.sunX;
    const dy = direction.y - this.sunY;
    const dz = direction.z - this.sunZ;
    const colourChanged =
      Math.abs(lighting.skyTop.r - this.skyTopR) > 0.012 ||
      Math.abs(lighting.skyTop.g - this.skyTopG) > 0.012 ||
      Math.abs(lighting.skyTop.b - this.skyTopB) > 0.012 ||
      Math.abs(lighting.skyHorizon.r - this.skyHorizonR) > 0.012 ||
      Math.abs(lighting.skyHorizon.g - this.skyHorizonG) > 0.012 ||
      Math.abs(lighting.skyHorizon.b - this.skyHorizonB) > 0.012;

    return (
      dx * dx + dy * dy + dz * dz > 0.0004 ||
      Math.abs(lighting.sunIntensity - this.sunIntensity) > 0.05 ||
      Math.abs(lighting.ambientIntensity - this.ambientIntensity) > 0.025 ||
      Math.abs(lighting.lamp - this.lamp) > 0.04 ||
      colourChanged
    );
  }

  commit(now: number, lighting: ReflectionLighting) {
    this.captured = true;
    this.capturedAt = now;
    const direction = lighting.sunDirection;
    this.sunX = direction.x;
    this.sunY = direction.y;
    this.sunZ = direction.z;
    this.sunIntensity = lighting.sunIntensity;
    this.skyTopR = lighting.skyTop.r;
    this.skyTopG = lighting.skyTop.g;
    this.skyTopB = lighting.skyTop.b;
    this.skyHorizonR = lighting.skyHorizon.r;
    this.skyHorizonG = lighting.skyHorizon.g;
    this.skyHorizonB = lighting.skyHorizon.b;
    this.ambientIntensity = lighting.ambientIntensity;
    this.lamp = lighting.lamp;
  }
}
