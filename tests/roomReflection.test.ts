import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  prepareRoomReflection,
  registerRoomReflectionPreparation,
  ROOM_REFLECTION_INTERVAL_SECONDS,
  RoomReflectionSchedule,
} from '../src/scene/roomReflection';
import { waterUniforms } from '../src/scene/tank/underwater';
import { createWaterSurfaceMaterial } from '../src/scene/tank/waterSurfaceMaterial';

const lighting = () => ({
  sunDirection: new THREE.Vector3(0.4, -0.6, -0.2).normalize(),
  sunIntensity: 2.1,
  skyTop: new THREE.Color('#79a9d1'),
  skyHorizon: new THREE.Color('#f0c18e'),
  ambientIntensity: 0.72,
  lamp: 0.1,
});

describe('room reflection schedule', () => {
  it('awaits the registered environment preparation before scene readiness', async () => {
    const calls: string[] = [];
    const unregister = registerRoomReflectionPreparation(async () => {
      calls.push('capture');
      await Promise.resolve();
      calls.push('compile');
    });

    await prepareRoomReflection();
    unregister();

    expect(calls).toEqual(['capture', 'compile']);
  });

  it('waits for the scene to become ready before its initial capture', () => {
    const schedule = new RoomReflectionSchedule();
    const state = lighting();

    expect(schedule.needsCapture(10, state, false)).toBe(false);
    expect(schedule.needsCapture(10, state, true)).toBe(true);
  });

  it('captures immediately, then leaves unchanged lighting alone', () => {
    const schedule = new RoomReflectionSchedule();
    const state = lighting();

    expect(schedule.needsCapture(0, state)).toBe(true);
    schedule.commit(0, state);
    expect(schedule.needsCapture(ROOM_REFLECTION_INTERVAL_SECONDS + 1, state)).toBe(false);
  });

  it('waits at least five seconds before accepting a daylight change', () => {
    const schedule = new RoomReflectionSchedule();
    const state = lighting();
    schedule.needsCapture(0, state);
    schedule.commit(0, state);
    state.sunDirection.set(0.1, -0.3, -0.9).normalize();
    state.lamp = 0.9;

    expect(schedule.needsCapture(4.99, state)).toBe(false);
    expect(schedule.needsCapture(5, state)).toBe(true);
    schedule.commit(5, state);
    expect(schedule.needsCapture(5.01, state)).toBe(false);
  });

  it('does not recapture subthreshold sky easing', () => {
    const schedule = new RoomReflectionSchedule();
    const state = lighting();
    schedule.commit(0, state);
    state.skyTop.offsetHSL(0, 0, 0.001);
    state.ambientIntensity += 0.001;

    expect(schedule.needsCapture(10, state)).toBe(false);
  });
});

describe('water room reflection shader', () => {
  it('samples the shared room cube texture with a reflected view ray', () => {
    const material = createWaterSurfaceMaterial();

    expect(material.uniforms.uRoomReflection).toBe(waterUniforms.uRoomReflection);
    expect(material.fragmentShader).toContain('textureCube(uRoomReflection');
    expect(material.fragmentShader).toContain('reflect(');
  });
});
