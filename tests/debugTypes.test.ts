import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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

const exportBlock = (source: string) => {
  const match = source.match(/export type \{([\s\S]*?)\} from '\.\.\/declarations';/);
  return match ? match[1] : null;
};

describe('single debug/perf type source', () => {
  it('re-exports every canonical Vibe type from the perfDebug module export list', () => {
    const block = exportBlock(read('src/utils/perfDebug.ts'));
    expect(block).not.toBeNull();
    for (const name of CANONICAL_NAMES) {
      expect(block).toMatch(new RegExp(`\\b${name}\\b`));
    }
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
});
