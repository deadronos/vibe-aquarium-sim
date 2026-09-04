import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

describe('project hygiene', () => {
  it('contains no removed renderer paths in the README', () => {
    expect(read('README.md')).not.toContain('src/systems/WaterResistanceSystem.tsx');
  });

  it('keeps the HTML shell base-path safe and descriptive', () => {
    const html = read('index.html');
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
    expect(html).toMatch(/<meta name="theme-color" content="#[0-9a-fA-F]{6}"/);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).not.toContain('/vite.svg');
    expect(html).toContain('href="favicon.svg"');
    expect(existsSync(resolve(root, 'public/favicon.svg'))).toBe(true);
  });

  it('uses the supported percentage shadow mode', () => {
    expect(read('src/SimulationScene.tsx')).toContain('shadows="percentage"');
  });
});
