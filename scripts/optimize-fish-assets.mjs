import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import {
  EXTMeshoptCompression,
  EXTTextureWebP,
  KHRMeshQuantization,
} from '@gltf-transform/extensions';
import { meshopt, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceDirectory = path.join(repositoryRoot, 'assets/source/fish');
const outputDirectory = path.join(repositoryRoot, 'public');
const fishAssetNames = ['Copilot3D-fish.glb', 'Copilot3D-fish2.glb', 'Copilot3D-fish3.glb'];
// A fish is 7-12 cm on screen, so ~1.5k triangles is plenty. The simplifier keeps UV seams and
// stops early if the error would exceed 1% of the mesh extent (in practice it stays near 0.2%).
const TARGET_TRIANGLES = 1_500;
const MAX_SIMPLIFY_ERROR = 0.01;

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} bytes`;
}

function formatReduction(sourceBytes, outputBytes) {
  const reducedBytes = sourceBytes - outputBytes;
  const percentage = sourceBytes === 0 ? 0 : (reducedBytes / sourceBytes) * 100;
  return `${formatBytes(sourceBytes)} -> ${formatBytes(outputBytes)} (${percentage.toFixed(2)}% reduction)`;
}

function countTriangles(document) {
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      triangles += (indices ?? primitive.getAttribute('POSITION')).getCount() / 3;
    }
  }
  return triangles;
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
  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);

  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, EXTTextureWebP, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

  const results = [];
  for (const assetName of fishAssetNames) {
    const sourcePath = path.join(sourceDirectory, assetName);
    const outputPath = path.join(outputDirectory, assetName);
    const sourceBytes = (await fs.stat(sourcePath)).size;
    const document = await io.read(sourcePath);
    const sourceTriangles = countTriangles(document);

    await document.transform(
      weld(),
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: Math.min(1, TARGET_TRIANGLES / sourceTriangles),
        error: MAX_SIMPLIFY_ERROR,
      }),
      meshopt({ encoder: MeshoptEncoder, level: 'high' }),
      textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, effort: 6 })
    );
    await io.write(outputPath, document);

    const outputBytes = (await fs.stat(outputPath)).size;
    results.push({ assetName, sourceBytes, outputBytes });
    console.log(`${assetName}: ${formatReduction(sourceBytes, outputBytes)}`);
    console.log(
      `${assetName}: ${sourceTriangles.toLocaleString('en-US')} -> ${countTriangles(document).toLocaleString('en-US')} triangles`
    );
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
