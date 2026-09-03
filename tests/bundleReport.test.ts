import fs from 'node:fs';
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

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('collectBundleReport', () => {
  it('reports sorted JavaScript gzip sizes and fish model totals', () => {
    const distDirectory = createFixtureDirectory();
    const aJavaScript = Buffer.from('export const aquarium = "calm";\n');
    const zJavaScript = Buffer.from('export const bubbles = 3;\n');
    const criticalModel = Buffer.from([0x67, 0x6c, 0x62]);
    const variantModel = Buffer.from([0x66, 0x69, 0x73, 0x68]);

    fs.writeFileSync(path.join(distDirectory, 'assets', 'z.js'), zJavaScript);
    fs.writeFileSync(path.join(distDirectory, 'assets', 'a.js'), aJavaScript);
    fs.writeFileSync(path.join(distDirectory, 'Copilot3D-fish2.glb'), variantModel);
    fs.writeFileSync(path.join(distDirectory, 'Copilot3D-fish.glb'), criticalModel);

    expect(collectBundleReport(distDirectory)).toEqual({
      javascript: {
        rawBytes: aJavaScript.byteLength + zJavaScript.byteLength,
        gzipBytes: gzipSync(aJavaScript).byteLength + gzipSync(zJavaScript).byteLength,
        files: [
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
