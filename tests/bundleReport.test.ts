import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { collectBundleReport, formatBundleReport } from '../scripts/bundle-report.mjs';

const temporaryDirectories: string[] = [];

function createFixtureDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-aquarium-bundle-report-'));
  temporaryDirectories.push(directory);
  fs.mkdirSync(path.join(directory, 'assets'));
  return directory;
}

function createBudgetFixtureDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-aquarium-bundle-budget-'));
  temporaryDirectories.push(directory);
  const distDirectory = path.join(directory, 'dist');
  fs.mkdirSync(path.join(distDirectory, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(distDirectory, 'assets', 'a.js'), 'export const fish = 1;\n');
  fs.writeFileSync(path.join(distDirectory, 'Copilot3D-fish.glb'), Buffer.from([0x66]));
  fs.writeFileSync(path.join(distDirectory, 'Copilot3D-fish2.glb'), Buffer.from([0x67]));
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('collectBundleReport', () => {
  it('fails closed for invalid budget overrides while accepting valid overrides', () => {
    const fixtureDirectory = createBudgetFixtureDirectory();
    const budgetCheckPath = path.resolve(process.cwd(), 'scripts/check-bundle-budget.mjs');
    const validEnvironment = {
      ...process.env,
      MAX_JS_GZIP_BYTES: '100000',
      MAX_MODEL_BYTES: '100000',
      MAX_CRITICAL_MODEL_BYTES: '100000',
    };

    expect(() =>
      execFileSync(process.execPath, [budgetCheckPath], {
        cwd: fixtureDirectory,
        env: validEnvironment,
        stdio: 'pipe',
      })
    ).not.toThrow();
    expect(() =>
      execFileSync(process.execPath, [budgetCheckPath], {
        cwd: fixtureDirectory,
        env: { ...validEnvironment, MAX_MODEL_BYTES: 'not-a-number' },
        stdio: 'pipe',
      })
    ).toThrow();
  });

  it('rejects a build without the critical fish model', () => {
    const distDirectory = createFixtureDirectory();
    fs.writeFileSync(path.join(distDirectory, 'Copilot3D-fish2.glb'), Buffer.from([0x66, 0x69]));

    expect(() => collectBundleReport(distDirectory)).toThrow(
      'Critical model Copilot3D-fish.glb is missing from the bundle output.'
    );
  });

  it('reports sorted JavaScript gzip sizes and fish model totals', () => {
    const distDirectory = createFixtureDirectory();
    const aJavaScript = Buffer.from('export const aquarium = "calm";\n');
    const bJavaScript = Buffer.from('export const current = "gentle";\n');
    const zJavaScript = Buffer.from('export const bubbles = 3;\n');
    const criticalModel = Buffer.from([0x67, 0x6c, 0x62]);
    const variantModel = Buffer.from([0x66, 0x69, 0x73, 0x68]);

    fs.writeFileSync(path.join(distDirectory, 'assets', 'z.js'), zJavaScript);
    fs.writeFileSync(path.join(distDirectory, 'assets', 'a.js'), aJavaScript);
    fs.writeFileSync(path.join(distDirectory, 'assets', 'B.js'), bJavaScript);
    fs.writeFileSync(path.join(distDirectory, 'Copilot3D-fish2.glb'), variantModel);
    fs.writeFileSync(path.join(distDirectory, 'Copilot3D-fish.glb'), criticalModel);

    const report = collectBundleReport(distDirectory);

    expect(report.javascript.gzipBytes).toBeGreaterThan(0);
    expect(report.javascript.files.every((file) => file.gzipBytes > 0)).toBe(true);
    expect(report).toEqual({
      javascript: {
        rawBytes: aJavaScript.byteLength + bJavaScript.byteLength + zJavaScript.byteLength,
        gzipBytes:
          gzipSync(aJavaScript).byteLength +
          gzipSync(bJavaScript).byteLength +
          gzipSync(zJavaScript).byteLength,
        files: [
          {
            name: 'B.js',
            rawBytes: bJavaScript.byteLength,
            gzipBytes: gzipSync(bJavaScript).byteLength,
          },
          {
            name: 'a.js',
            rawBytes: aJavaScript.byteLength,
            gzipBytes: gzipSync(aJavaScript).byteLength,
          },
          {
            name: 'z.js',
            rawBytes: zJavaScript.byteLength,
            gzipBytes: gzipSync(zJavaScript).byteLength,
          },
        ],
      },
      models: {
        totalBytes: criticalModel.byteLength + variantModel.byteLength,
        files: [
          { name: 'Copilot3D-fish.glb', bytes: criticalModel.byteLength },
          { name: 'Copilot3D-fish2.glb', bytes: variantModel.byteLength },
        ],
      },
      criticalModel: { name: 'Copilot3D-fish.glb', bytes: criticalModel.byteLength },
    });
  });

  it('formats aligned deterministic Markdown tables', () => {
    expect(
      formatBundleReport({
        javascript: {
          rawBytes: 12,
          gzipBytes: 8,
          files: [{ name: 'a.js', rawBytes: 12, gzipBytes: 8 }],
        },
        models: {
          totalBytes: 3,
          files: [{ name: 'Copilot3D-fish.glb', bytes: 3 }],
        },
        criticalModel: { name: 'Copilot3D-fish.glb', bytes: 3 },
      })
    ).toContain('| Copilot3D-fish.glb |         3 |');
  });
});
