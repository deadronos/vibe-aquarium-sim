# Phase 5 Asset Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Reduce simulation-start transfer by at least 30% for fish assets while preserving fish appearance, model selection, and renderer behavior.

**Architecture:** Keep the primary fish model in the critical Suspense path, then mount each variant behind its own deferred Suspense/error boundary. Store mesh refs and lighting uniforms in stable parent refs so the allocation-free frame loop can render available models and fall back to the primary model while variants load. Generate public GLBs from checked-in source GLBs with pinned tooling, and share one report collector between the human-readable report and CI budgets.

**Tech Stack:** React 19, React Three Fiber/Drei, Three.js, Vite/Rolldown, glTF Transform 4.5.0, Meshoptimizer 0.23.0, Sharp 0.35.4, Vitest, Playwright.

---

## File map

- Create source inputs: assets/source/fish/Copilot3D-fish.glb, assets/source/fish/Copilot3D-fish2.glb, assets/source/fish/Copilot3D-fish3.glb.
- Create scripts: scripts/optimize-fish-assets.mjs, scripts/verify-fish-assets.mjs, scripts/bundle-report.mjs.
- Create modules: src/performance/chunkClassification.ts, src/systems/FishModelMesh.tsx.
- Create tests: tests/fishAssets.test.ts, tests/chunkClassification.test.ts, tests/bundleReport.test.ts, tests/FishRenderSystem.loading.test.tsx.
- Create documentation: docs/performance/asset-transfer.md.
- Modify package.json, package-lock.json, vite.config.ts, src/systems/fishModels.ts, src/systems/FishRenderSystem.tsx, src/declarations.d.ts, existing fish renderer tests, tests/e2e/smoke.spec.ts, and scripts/check-bundle-budget.mjs.
- Delete src/assets/gltf/CopilotClownFish.glb after the reference scan confirms it is unused.

### Task 1: Add the asset contract and pinned tooling

**Files:** tests/fishAssets.test.ts, package.json, package-lock.json, moved source GLBs, deleted obsolete GLB.

- [ ] **Step 1: Write the failing generated-asset test.**

~~~ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const modelFiles = ['Copilot3D-fish.glb', 'Copilot3D-fish2.glb', 'Copilot3D-fish3.glb'];

function readGlbJson(file: string): Record<string, unknown> {
  const bytes = fs.readFileSync(file);
  expect(bytes.toString('ascii', 0, 4)).toBe('glTF');
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength)) as Record<string, unknown>;
}

describe('fish production assets', () => {
  it('ships Meshopt-compressed WebP fish models and no obsolete source model', () => {
    for (const name of modelFiles) {
      const json = readGlbJson(path.join(process.cwd(), 'public', name));
      expect(json.extensionsUsed).toEqual(
        expect.arrayContaining(['EXT_meshopt_compression', 'EXT_texture_webp'])
      );
      expect(json.images).toEqual(
        expect.arrayContaining([expect.objectContaining({ mimeType: 'image/webp' })])
      );
    }
    expect(fs.existsSync(path.join(process.cwd(), 'src/assets/gltf/CopilotClownFish.glb'))).toBe(
      false
    );
  });
});
~~~

- [ ] **Step 2: Run the focused test and verify failure.**

~~~bash
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase5-assets.localstorage' npm run test -- tests/fishAssets.test.ts
~~~

Expected: failure because current GLBs lack both extensions and the obsolete source still exists.

- [ ] **Step 3: Pin tooling and establish source inputs.**

~~~bash
npm install --save-dev --save-exact @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 @gltf-transform/functions@4.5.0 meshoptimizer@0.23.0 sharp@0.35.4
mkdir -p assets/source/fish
git mv public/Copilot3D-fish.glb assets/source/fish/Copilot3D-fish.glb
git mv public/Copilot3D-fish2.glb assets/source/fish/Copilot3D-fish2.glb
git mv public/Copilot3D-fish3.glb assets/source/fish/Copilot3D-fish3.glb
git rm src/assets/gltf/CopilotClownFish.glb
~~~

Run rg before removal: rg -n "CopilotClownFish|assets/gltf" src tests scripts. The binary must have no references.

- [ ] **Step 4: Add the optimizer and package scripts.**

Create scripts/optimize-fish-assets.mjs with these exact operations:

~~~js
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, EXTTextureWebP]);
await MeshoptEncoder.ready;
const document = await io.read(input);
await document.transform(
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, effort: 6 })
);
await io.write(output, document);
~~~

The script must process exactly the three files in assets/source/fish, write matching names to public, resolve the root with fileURLToPath(new URL('..', import.meta.url)), and print per-file plus total raw-byte reductions.

Add package scripts:

~~~json
"assets:optimize": "node scripts/optimize-fish-assets.mjs",
"assets:verify": "node scripts/verify-fish-assets.mjs"
~~~

- [ ] **Step 5: Add the artifact verifier and make the focused test pass.**

verify-fish-assets.mjs must validate GLB magic, required extensions, at least one image/webp, and total output <= 2,921,368 bytes (70% of the 4,173,384-byte baseline). Run optimizer, verifier, and focused test; expected output is at least 30% reduction and passing tests.

- [ ] **Step 6: Commit.**

~~~bash
git add assets/source/fish public/Copilot3D-fish*.glb scripts/optimize-fish-assets.mjs scripts/verify-fish-assets.mjs tests/fishAssets.test.ts package.json package-lock.json
git commit -m "perf: optimize fish assets with meshopt and webp"
~~~

### Task 2: Make dependency chunk classification path-safe

**Files:** src/performance/chunkClassification.ts, tests/chunkClassification.test.ts, vite.config.ts.

- [ ] **Step 1: Write tests for Rapier-before-R3F-before-Three ordering.**

~~~ts
import { describe, expect, it } from 'vitest';
import { classifyDependencyChunk } from '../src/performance/chunkClassification';

describe('classifyDependencyChunk', () => {
  it.each([
    ['/repo/node_modules/@react-three/rapier/index.js', 'rapier'],
    ['/repo/node_modules/@dimforge/rapier3d-compat/rapier.js', 'rapier'],
    ['/repo/node_modules/@react-three/fiber/index.js', 'r3f-drei'],
    ['/repo/node_modules/@react-three/drei/index.js', 'r3f-drei'],
    ['/repo/node_modules/three-stdlib/controls.js', 'r3f-drei'],
    ['/repo/node_modules/three/build/three.module.js', 'vendor'],
    ['/repo/node_modules/miniplex/index.js', 'miniplex'],
    ['/repo/node_modules/zustand/esm/index.mjs', 'vendor'],
  ])('%s -> %s', (id, expected) => expect(classifyDependencyChunk(id)).toBe(expected));

  it('leaves application files unclassified', () => {
    expect(classifyDependencyChunk('/repo/src/main.tsx')).toBeUndefined();
  });
});
~~~

- [ ] **Step 2: Run the focused test and verify the helper is missing.**

~~~bash
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase5-chunks.localstorage' npm run test -- tests/chunkClassification.test.ts
~~~

Expected: failure because the helper does not exist.

- [ ] **Step 3: Implement the path-safe classifier.**

~~~ts
export type DependencyChunk = 'rapier' | 'r3f-drei' | 'vendor' | 'miniplex' | 'tweening';

export function classifyDependencyChunk(id: string): DependencyChunk | undefined {
  const normalized = id.replaceAll('\\', '/');
  const marker = '/node_modules/';
  const start = normalized.lastIndexOf(marker);
  if (start < 0) return undefined;
  const packagePath = normalized.slice(start + marker.length);
  const hasPrefix = (prefixes: readonly string[]) =>
    prefixes.some((prefix) => packagePath.startsWith(prefix));

  if (hasPrefix(['@react-three/rapier/', '@dimforge/rapier3d-compat/', '@dimforge/rapier3d/'])) {
    return 'rapier';
  }
  if (hasPrefix(['@react-three/', 'drei/', 'three-stdlib/'])) return 'r3f-drei';
  if (hasPrefix(['three/'])) return 'vendor';
  if (hasPrefix(['miniplex/'])) return 'miniplex';
  if (hasPrefix(['zustand/'])) return 'vendor';
  if (hasPrefix(['tween/', 'gsap/'])) return 'tweening';
  return 'vendor';
}
~~~

- [ ] **Step 4: Wire Vite to the helper, run focused tests, build, and inspect dist/assets JS names.**

Expected: tests/build pass, dependency-specific chunks are present when Rollup has content, and no startup-order errors appear in smoke tests.

- [ ] **Step 5: Commit.**

~~~bash
git add src/performance/chunkClassification.ts tests/chunkClassification.test.ts vite.config.ts
git commit -m "perf: make dependency chunking path-aware"
~~~

### Task 3: Add shared bundle reporting and tightened budgets

**Files:** scripts/bundle-report.mjs, tests/bundleReport.test.ts, scripts/check-bundle-budget.mjs, package.json, docs/performance/asset-transfer.md.

- [ ] **Step 1: Write a fixture test.**

Create a temporary dist/assets/a.js and two root GLBs, call collectBundleReport(distDir), and assert sorted per-file entries, positive JS gzip bytes, model total equal to file sizes, and a critical Copilot3D-fish.glb entry.

- [ ] **Step 2: Run the focused test and verify the collector is missing.**

~~~bash
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase5-report.localstorage' npm run test -- tests/bundleReport.test.ts
~~~

Expected: failure because the collector does not exist.

- [ ] **Step 3: Implement the collector and CLI.**

Export collectBundleReport(distDir) from scripts/bundle-report.mjs using fs readdirSync/statSync and gzipSync. Return this stable, sorted shape:

~~~js
{
  javascript: { rawBytes, gzipBytes, files: [{ name, rawBytes, gzipBytes }] },
  models: { totalBytes, files: [{ name, bytes }] },
  criticalModel: { name: 'Copilot3D-fish.glb', bytes }
}
~~~

The CLI accepts --dist and --output, prints markdown, and writes deterministic content with no timestamp/hash.

- [ ] **Step 4: Reuse the collector in the budget check.**

Use these defaults and retain environment overrides:

~~~js
const maxJavaScriptGzipBytes = Number(process.env.MAX_JS_GZIP_BYTES ?? 1_700_000);
const maxModelBytes = Number(process.env.MAX_MODEL_BYTES ?? 2_921_368);
const maxCriticalModelBytes = Number(process.env.MAX_CRITICAL_MODEL_BYTES ?? 960_000);
~~~

Print a critical-model line and fail if that limit is exceeded.

- [ ] **Step 5: Record baseline and measured output.**

Add report:bundle as node scripts/bundle-report.mjs --dist dist --output docs/performance/asset-transfer.md. The document must include baseline fish 4,173,384 raw bytes, baseline major JavaScript 1,409,849 gzip bytes, post-build tables, exact package versions, Meshopt high, and WebP quality 82/effort 6.

- [ ] **Step 6: Run and commit.**

~~~bash
npm run build
npm run report:bundle
npm run check:bundle
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase5-report.localstorage' npm run test -- tests/bundleReport.test.ts
git add scripts/bundle-report.mjs scripts/check-bundle-budget.mjs tests/bundleReport.test.ts docs/performance/asset-transfer.md package.json
git commit -m "perf: report and gate asset transfer budgets"
~~~

### Task 4: Refactor fish model loading to critical-plus-deferred assets

**Files:** src/systems/FishModelMesh.tsx, src/systems/FishRenderSystem.tsx, src/systems/fishModels.ts, src/declarations.d.ts, existing renderer tests, tests/FishRenderSystem.loading.test.tsx.

- [ ] **Step 1: Add and test the pure fallback helper.**

~~~ts
export type FishModelIndex = 0 | 1 | 2;

export function resolveFishModelIndex(
  requested: number,
  available: readonly [boolean, boolean, boolean]
): FishModelIndex {
  const index: FishModelIndex = requested === 1 || requested === 2 ? requested : 0;
  return available[index] ? index : 0;
}
~~~

Test requested variants both unavailable and available, plus invalid requests.

- [ ] **Step 2: Create FishModelMesh.**

Props are modelIndex, gltf, meshRef, uniformsRef, lighting, and onReady. The component extracts/clones the first mesh, preserves existing rim/SSS enhancement rules, renders one instancedMesh, stores uniforms in the supplied ref, and calls onReady in an effect. Geometry/material creation stays in useMemo.

- [ ] **Step 3: Add variant boundaries and status diagnostics.**

Each variant boundary catches load errors, logs FishRenderSystem: failed to load model #N once, and renders null. Add this Window shape to src/declarations.d.ts:

~~~ts
__vibe_fishAssetStatus?: {
  primary: 'loading' | 'ready' | 'error';
  variants: ['loading' | 'ready' | 'error', 'loading' | 'ready' | 'error'];
};
~~~

Keep one stable status object, update it from readiness/error callbacks, and delete it on unmount.

- [ ] **Step 4: Mount primary first and variants after readiness.**

The parent keeps useGLTF(MODEL_URLS[0]), renders primary FishModelMesh, and only after primary onReady mounts each variant in its own Suspense fallback null plus error boundary. Each variant calls useGLTF for one URL. Replace parent all-three-model useMemo/uniform arrays with stable refs populated by children.

- [ ] **Step 5: Update the frame loop.**

Require only meshRefA. Resolve each entity’s requested index through resolveFishModelIndex; unresolved variants use primary mesh/count/pool. Flush B/C only when refs are non-null. Update uniform time through stable refs. Do not allocate vectors/arrays in useFrame.

- [ ] **Step 6: Update mocks and tests.**

Make useGLTF mocks URL-based. Add tests for primary-first request, variant failure preserving the primary mesh/status, both variants eventually ready, and preservation of existing lighting/adaptive/cap/flush behavior. Use async act turns for readiness.

- [ ] **Step 7: Commit.**

~~~bash
git add src/systems/FishModelMesh.tsx src/systems/FishRenderSystem.tsx src/systems/fishModels.ts src/declarations.d.ts tests/FishRenderSystem.loading.test.tsx tests/FishRenderSystem.test.ts tests/fishLightingMaterial.test.tsx tests/FishRenderSystem.adaptive.test.tsx tests/FishRenderSystem.cap.test.tsx
git commit -m "perf: defer fish variant model loading"
~~~

### Task 5: Verify browser transfer order and visual continuity

**Files:** tests/e2e/smoke.spec.ts.

- [ ] **Step 1: Add the critical-first smoke test.**

Track GLB request URLs before navigation, use domcontentloaded for the first assertion, assert the first fish request ends with Copilot3D-fish.glb, then wait for window.__vibe_fishAssetStatus primary ready and both variants ready. Verify canvas visibility and no page errors/404 responses.

- [ ] **Step 2: Run the focused production-preview smoke test.**

~~~bash
npm run build
npm run check:bundle
npx playwright test tests/e2e/smoke.spec.ts -g "critical fish model"
~~~

Expected: primary precedes variants, all optimized GLBs return model/gltf-binary, status reaches ready, and there are no errors.

- [ ] **Step 3: Commit.**

~~~bash
git add tests/e2e/smoke.spec.ts docs/performance/asset-transfer.md
git commit -m "test: verify critical fish asset loading"
~~~

### Task 6: Full validation and handoff

- [ ] **Step 1: Run static checks and the complete unit suite.**

~~~bash
npm run format:check
npm run lint -- --max-warnings=0
npm run typecheck
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase5-final.localstorage' npm run test -- --run
~~~

Expected: all commands exit 0 and the suite reports at least the 145 baseline passing tests plus new coverage.

- [ ] **Step 2: Run production validation.**

~~~bash
npm run build
npm run assets:verify
npm run report:bundle
npm run check:bundle
npm run test:smoke
git diff --check
~~~

Expected: at least 30% fish-asset reduction, all smoke scenarios pass, and diff check is clean.

- [ ] **Step 3: Verify branch state and prepare the PR.**

~~~bash
git status --short --branch
git log --oneline --decorate -8
~~~

The PR description must include baseline/post raw and gzip tables, exact optimizer settings, chunk observations, browser request-order/visual results, validation commands, and links to issues 145 and 150.

