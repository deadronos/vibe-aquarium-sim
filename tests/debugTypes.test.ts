import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  VibeDebugCollector,
  VibeRenderEntry,
  VibeRenderStatus,
  VibeSchedEntry,
  VibeSchedStatus,
  VibeSchedulerTuningEntry,
  VibeSimEntry,
} from '../src/utils/perfDebug';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

const walk = (dir: string): string[] =>
  readdirSync(resolve(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const CANONICAL_NAMES = [
  'VibeRenderStatus',
  'VibeSchedStatus',
  'VibeDebugCollector',
  'VibeSimEntry',
  'VibeRenderEntry',
  'VibeSchedEntry',
  'VibeSchedulerTuningEntry',
] as const;

describe('single debug/perf type source', () => {
  it('re-exports the canonical Vibe types from the perfDebug runtime module', () => {
    const perfDebug = read('src/utils/perfDebug.ts');
    for (const name of CANONICAL_NAMES) {
      expect(perfDebug).toContain(name);
    }
    expect(perfDebug).toMatch(/export type \{[\s\S]*?\} from '\.\.\/declarations';/);
  });

  it('declares the canonical shapes once in declarations.d.ts', () => {
    const decls = read('src/declarations.d.ts');
    expect(decls).toMatch(/export type VibeDebugCollector = \{/);
    expect(decls).toMatch(/export type VibeRenderStatus =/);
    expect(decls).toMatch(/export type VibeSchedStatus =/);
    expect(decls).toMatch(/export type VibeSimEntry =/);
    expect(decls).toMatch(/export type VibeRenderEntry =/);
    expect(decls).toMatch(/export type VibeSchedEntry =/);
    expect(decls).toMatch(/export type VibeSchedulerTuningEntry =/);
  });

  it('does not redeclare debug types inside DebugHUD', () => {
    const hud = read('src/components/DebugHUD.tsx');
    expect(hud).not.toMatch(/declare global/);
    expect(hud).not.toMatch(/interface Window/);
    expect(hud).not.toMatch(/interface (SimEntry|RenderEntry|SchedEntry|SchedulerTuningEntry)\b/);
    expect(hud).toMatch(/from '\.\.\/utils\/perfDebug'/);
  });

  it('keeps a single Window augmentation across src', () => {
    const sites = walk('src')
      .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
      .filter((file) => /interface Window/.test(read(file)));
    expect(sites).toEqual(['src/declarations.d.ts']);
  });

  it('exposes the canonical debug/perf shapes to importers', () => {
    expectTypeOf<VibeRenderStatus>().toEqualTypeOf<{
      ema: number;
      updateFreq?: number;
      activeEntities?: number;
      frameDuration?: number;
    } | null>();
    expectTypeOf<VibeSchedStatus>().toEqualTypeOf<{
      ema: number;
      fixedStepHz?: number;
      lastDuration?: number;
    } | null>();
    expectTypeOf<VibeSimEntry>().toEqualTypeOf<{
      duration: number;
      time: number;
      fishCount: number;
    }>();
    expectTypeOf<VibeRenderEntry>().toEqualTypeOf<{
      frame: number;
      duration: number;
      counts: { countA: number; countB: number; countC: number };
      activeEntities: number;
      ema?: number;
      flushed?: number;
    }>();
    expectTypeOf<VibeSchedEntry>().toEqualTypeOf<{
      duration: number;
      subSteps?: number;
      time?: number;
      ema?: number;
    }>();
    expectTypeOf<VibeSchedulerTuningEntry>().toEqualTypeOf<{
      time: number;
      action: 'reduce' | 'restore';
      from?: number;
      to: number;
    }>();

    const collector: VibeDebugCollector = {
      simulateStep: [],
      fishRender: [],
      fishUseFrame: [],
    };
    expect(collector.simulateStep).toHaveLength(0);
  });
});
