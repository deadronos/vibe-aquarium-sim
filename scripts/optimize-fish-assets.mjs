import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import {
  EXTMeshoptCompression,
  EXTTextureWebP,
  KHRMeshQuantization,
} from '@gltf-transform/extensions';
import { meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceDirectory = path.join(repositoryRoot, 'assets/source/fish');
const outputDirectory = path.join(repositoryRoot, 'public');
const fishAssetNames = ['Copilot3D-fish.glb', 'Copilot3D-fish2.glb', 'Copilot3D-fish3.glb'];

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} bytes`;
}

function formatReduction(sourceBytes, outputBytes) {
  const reducedBytes = sourceBytes - outputBytes;
  const percentage = sourceBytes === 0 ? 0 : (reducedBytes / sourceBytes) * 100;
  return `${formatBytes(sourceBytes)} -> ${formatBytes(outputBytes)} (${percentage.toFixed(2)}% reduction)`;
}

async function assertExpectedSources() {
  const entries = await fs.readdir(sourceDirectory, { withFileTypes: true });
  const sourceNames = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.glb')
    .map((entry) => entry.name)
    .sort();
  const expectedNames = [...fishAssetNames].sort();

  if (
    sourceNames.length !== expectedNames.length ||
    sourceNames.some((name, index) => name !== expectedNames[index])
  ) {
    throw new Error(
      `Expected exactly ${fishAssetNames.length} fish source GLBs (${fishAssetNames.join(', ')}), found ${sourceNames.join(', ') || 'none'}.`
    );
  }
}

async function optimizeFishAssets() {
  await assertExpectedSources();
  await fs.mkdir(outputDirectory, { recursive: true });
  await MeshoptEncoder.ready;

  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, EXTTextureWebP, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

  const results = [];
  for (const assetName of fishAssetNames) {
    const sourcePath = path.join(sourceDirectory, assetName);
    const outputPath = path.join(outputDirectory, assetName);
    const sourceBytes = (await fs.stat(sourcePath)).size;
    const document = await io.read(sourcePath);

    await document.transform(
      meshopt({ encoder: MeshoptEncoder, level: 'high' }),
      textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, effort: 6 })
    );
    await io.write(outputPath, document);

    const outputBytes = (await fs.stat(outputPath)).size;
    results.push({ assetName, sourceBytes, outputBytes });
    console.log(`${assetName}: ${formatReduction(sourceBytes, outputBytes)}`);
  }

  const sourceTotal = results.reduce((total, result) => total + result.sourceBytes, 0);
  const outputTotal = results.reduce((total, result) => total + result.outputBytes, 0);
  console.log(`Total: ${formatReduction(sourceTotal, outputTotal)}`);
}

optimizeFishAssets().catch((error) => {
  console.error(
    `Fish asset optimization failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
});
