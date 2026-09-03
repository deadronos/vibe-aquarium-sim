import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const FISH_ASSET_NAMES = ['Copilot3D-fish.glb', 'Copilot3D-fish2.glb', 'Copilot3D-fish3.glb'];

type GlbJson = {
  extensionsUsed?: string[];
  images?: Array<{ mimeType?: string }>;
};

function readGlbJson(filePath: string): GlbJson {
  const file = fs.readFileSync(filePath);
  const bytes = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error(`${filePath} does not have a valid GLB magic header`);
  }

  const declaredLength = view.getUint32(8, true);
  if (declaredLength !== bytes.byteLength) {
    throw new Error(`${filePath} has an invalid declared length`);
  }

  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;

    if (chunkEnd > bytes.byteLength) {
      throw new Error(`${filePath} has a chunk outside the file`);
    }

    if (chunkType === JSON_CHUNK_TYPE) {
      const chunk = bytes.subarray(chunkStart, chunkEnd);
      const jsonText = new TextDecoder()
        .decode(chunk)
        .replaceAll(String.fromCharCode(0), '')
        .trim();
      return JSON.parse(jsonText) as GlbJson;
    }

    offset = chunkEnd;
  }

  throw new Error(`${filePath} is missing a JSON chunk`);
}

describe('fish asset contract', () => {
  it('ships optimized fish GLBs with meshopt, WebP, and embedded WebP textures', () => {
    for (const assetName of FISH_ASSET_NAMES) {
      const filePath = path.resolve(process.cwd(), 'public', assetName);
      const gltf = readGlbJson(filePath);

      expect(gltf.extensionsUsed).toEqual(
        expect.arrayContaining(['EXT_meshopt_compression', 'EXT_texture_webp'])
      );
      expect(gltf.images?.some((image) => image.mimeType === 'image/webp')).toBe(true);
    }
  });

  it('does not retain the obsolete source fish GLB', () => {
    const obsoletePath = path.resolve(process.cwd(), 'src/assets/gltf/CopilotClownFish.glb');
    expect(fs.existsSync(obsoletePath)).toBe(false);
  });
});
