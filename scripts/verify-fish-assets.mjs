import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import {
  EXTMeshoptCompression,
  EXTTextureWebP,
  KHRMeshQuantization,
} from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const defaultOutputDirectory = path.join(repositoryRoot, 'public');
const fishAssetNames = ['Copilot3D-fish.glb', 'Copilot3D-fish2.glb', 'Copilot3D-fish3.glb'];
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const MAX_TOTAL_BYTES = 2_921_368;

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, EXTTextureWebP, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} bytes`;
}

function readGlbJson(filePath, bytes) {
  if (bytes.byteLength < 12) {
    throw new Error('file is shorter than the GLB header');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('invalid GLB magic');
  }
  if (view.getUint32(4, true) !== GLB_VERSION) {
    throw new Error('unsupported GLB version');
  }
  if (view.getUint32(8, true) !== bytes.byteLength) {
    throw new Error('declared GLB length does not match file length');
  }

  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > bytes.byteLength) {
      throw new Error('GLB chunk extends past the end of the file');
    }
    if (chunkType === JSON_CHUNK_TYPE) {
      const jsonBytes = bytes.subarray(chunkStart, chunkEnd);
      const jsonText = new TextDecoder()
        .decode(jsonBytes)
        .replaceAll(String.fromCharCode(0), '')
        .trim();
      return JSON.parse(jsonText);
    }
    offset = chunkEnd;
  }

  throw new Error('missing GLB JSON chunk');
}

function validateDocument(document) {
  const extensionsUsed = document.extensionsUsed;
  if (!Array.isArray(extensionsUsed)) {
    throw new Error('missing extensionsUsed');
  }
  for (const extension of ['EXT_meshopt_compression', 'EXT_texture_webp']) {
    if (!extensionsUsed.includes(extension)) {
      throw new Error(`missing required extension ${extension}`);
    }
  }

  if (
    !Array.isArray(document.images) ||
    !document.images.some((image) => image?.mimeType === 'image/webp')
  ) {
    throw new Error('missing embedded image/webp texture');
  }
}

async function validateParsedDocument(filePath) {
  await MeshoptDecoder.ready;
  const document = await io.read(filePath);
  const root = document.getRoot();
  const scenes = root.listScenes();
  const meshes = root.listMeshes();
  const accessors = root.listAccessors();
  const textures = root.listTextures();

  if (scenes.length === 0) {
    throw new Error('loader found no scenes');
  }
  if (meshes.length === 0 || !meshes.some((mesh) => mesh.listPrimitives().length > 0)) {
    throw new Error('loader found no renderable meshes');
  }
  for (const accessor of accessors) {
    const array = accessor.getArray();
    if (!array || array.length !== accessor.getCount() * accessor.getElementSize()) {
      throw new Error(
        `loader found invalid accessor data in ${accessor.getName() || 'unnamed accessor'}`
      );
    }
  }

  const webpTextures = textures.filter((texture) => texture.getMimeType() === 'image/webp');
  if (webpTextures.length === 0) {
    throw new Error('loader found no image/webp textures');
  }
  for (const texture of webpTextures) {
    const image = texture.getImage();
    if (!image || image.byteLength === 0) {
      throw new Error(`loader found empty image data in ${texture.getName() || 'unnamed texture'}`);
    }
    await sharp(image).raw().toBuffer();
  }
}

async function verifyFishAssets() {
  let totalBytes = 0;
  let hasFailure = false;
  const outputDirectory = process.env.FISH_ASSET_DIR?.trim()
    ? path.resolve(process.env.FISH_ASSET_DIR)
    : defaultOutputDirectory;

  for (const assetName of fishAssetNames) {
    const filePath = path.join(outputDirectory, assetName);
    try {
      const file = await fs.readFile(filePath);
      const bytes = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
      const document = readGlbJson(filePath, bytes);
      validateDocument(document);
      await validateParsedDocument(filePath);
      totalBytes += bytes.byteLength;
      console.log(`${assetName}: valid (${formatBytes(bytes.byteLength)})`);
    } catch (error) {
      hasFailure = true;
      console.error(
        `${assetName}: INVALID (${error instanceof Error ? error.message : String(error)})`
      );
    }
  }

  console.log(`Total: ${formatBytes(totalBytes)} (budget ${formatBytes(MAX_TOTAL_BYTES)})`);
  if (totalBytes > MAX_TOTAL_BYTES) {
    hasFailure = true;
    console.error(`Total fish asset output exceeds the ${formatBytes(MAX_TOTAL_BYTES)} budget.`);
  }
  if (hasFailure) {
    throw new Error('fish asset verification failed');
  }
}

verifyFishAssets().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
