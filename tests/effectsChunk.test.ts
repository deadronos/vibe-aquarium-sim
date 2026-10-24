import { describe, expect, it } from 'vitest';
import { effectsChunkUrl, rewriteEffectsChunkSource } from '../src/scene/effectsChunk';

const chunkUrl = new URL('https://example.com/vibe-aquarium-sim/assets/Effects-Dq9AUp6D.js');

const source = [
  'import{r as e}from"./rolldown-runtime-QTnfLwEv.js";',
  'import{a as t}from"./react-Dboqm-dD.js";',
  'import{d as i}from"./r3f-VnUs-C8m.js";',
  'import{t as a}from"./index-D6aLCFvP.js";',
  'import{a as o}from"./postprocessing-CMvSF_Xk.js";',
  'import"./side-effect-abcd.js";',
].join('');

describe('effects chunk retry', () => {
  it('keeps evaluated chunks on their original URLs and cache-busts post-processing', () => {
    const rewritten = rewriteEffectsChunkSource(source, chunkUrl, 2);
    expect(rewritten).toContain(
      'from"https://example.com/vibe-aquarium-sim/assets/rolldown-runtime-QTnfLwEv.js"'
    );
    expect(rewritten).toContain(
      'from"https://example.com/vibe-aquarium-sim/assets/react-Dboqm-dD.js"'
    );
    expect(rewritten).toContain(
      'from"https://example.com/vibe-aquarium-sim/assets/index-D6aLCFvP.js"'
    );
    expect(rewritten).toContain(
      'from"https://example.com/vibe-aquarium-sim/assets/postprocessing-CMvSF_Xk.js?retry=2"'
    );
    expect(rewritten).toContain(
      'import"https://example.com/vibe-aquarium-sim/assets/side-effect-abcd.js"'
    );
    expect(rewritten).not.toContain('from"./');
  });

  it('rewrites a second chunk the same way', () => {
    expect(rewriteEffectsChunkSource(source, chunkUrl, 3)).toContain(
      'postprocessing-CMvSF_Xk.js?retry=3'
    );
    expect(rewriteEffectsChunkSource(source, chunkUrl, 4)).toContain(
      'postprocessing-CMvSF_Xk.js?retry=4'
    );
  });

  it('reads the chunk URL from the failed import', () => {
    const error = new Error(
      'Failed to fetch dynamically imported module: https://example.com/vibe-aquarium-sim/assets/Effects-Dq9AUp6D.js'
    );
    expect(effectsChunkUrl(error)).toBe(
      'https://example.com/vibe-aquarium-sim/assets/Effects-Dq9AUp6D.js'
    );
    expect(effectsChunkUrl(new Error('something else'))).toBeNull();
  });
});
