import { expect, test, type Page, type TestInfo } from '@playwright/test';
import sharp from 'sharp';

const LEVEL = 'medium';
const VIEWPORT = { width: 1200, height: 800 };
const SETTLE_FRAMES = 4;
const STABILITY_GAP = 2;

const LEFT_REGION = { left: 150, top: 160, width: 420, height: 480 };
const TANK_REGION = { left: 300, top: 160, width: 860, height: 480 };

// Relative tolerances keep the test meaningful across native and software GPUs.
const GHOST_RATIO_MAX = 0.5; // ghost vs. fish-present difference
const GHOST_ABS_MAX = 9; // mean channel delta on an 8-bit scale
const STABILITY_ABS_MAX = 5;
const EXPOSURE_REL_MAX = 0.25;

const grid = (cx: number) => {
  const poses: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < 30; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    poses.push({ x: cx + (col - 2) * 0.28, y: 0.55 - row * 0.28, z: 0 });
  }
  return poses;
};

const LEFT_POSES = grid(-1.0);
const RIGHT_POSES = grid(1.0);

async function waitForAquarium(page: Page, backend: 'webgl' | 'webgpu') {
  await page.waitForFunction((b) => window.__vibe_rendererStatus?.selected === b, backend, {
    timeout: 30_000,
  });
  expect(await page.evaluate(() => window.__vibe_rendererStatus?.fallback)).toBe(false);
  await page.waitForFunction(() => window.__vibe_fishAssetStatus?.primary === 'ready', null, {
    timeout: 45_000,
  });
  await page.waitForFunction(() => (window.__vibe_renderStatus?.activeEntities || 0) === 30, null, {
    timeout: 30_000,
  });
  await page.waitForFunction(() => !!window.__vibe_test, null, { timeout: 15_000 });
}

async function capture(page: Page, name: string, testInfo: TestInfo): Promise<string> {
  const file = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: file, timeout: 30_000 });
  return file;
}

async function regionRaw(
  file: string,
  region: { left: number; top: number; width: number; height: number }
) {
  const { data, info } = await sharp(file)
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

function meanAbsDiff(
  a: { data: Buffer; info: sharp.OutputInfo },
  b: { data: Buffer; info: sharp.OutputInfo }
) {
  let sum = 0;
  const n = a.data.length / a.info.channels;
  for (let i = 0; i < a.data.length; i += a.info.channels) {
    sum +=
      (Math.abs(a.data[i] - b.data[i]) +
        Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2])) /
      3;
  }
  return sum / n;
}

async function meanLuminance(
  file: string,
  region: { left: number; top: number; width: number; height: number }
) {
  const { data, info } = await sharp(file)
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return sum / (data.length / info.channels);
}

type BackendCapture = {
  left: string;
  emptyRef: string;
  settled: string;
  settledAgain: string;
};

async function captureBackend(
  page: Page,
  backend: 'webgl' | 'webgpu',
  testInfo: TestInfo
): Promise<BackendCapture> {
  await page.addInitScript(() => {
    window.__vibe_debug = { simulateStep: [], fishRender: [], fishUseFrame: [] };
  });
  await page.setViewportSize(VIEWPORT);
  await page.goto(`./index.html?renderer=${backend}&quality=${LEVEL}&testHarness=1`, {
    waitUntil: 'domcontentloaded',
  });
  await waitForAquarium(page, backend);

  // Reference frame: fish always on the right, so the left region is genuinely empty.
  await page.evaluate((poses) => {
    window.__vibe_test.setAllPoses(poses);
    window.__vibe_test.freeze();
  }, RIGHT_POSES);
  await page.evaluate((frames) => window.__vibe_test.waitForFrames(frames), SETTLE_FRAMES);
  const emptyRef = await capture(page, `${backend}-empty-ref`, testInfo);

  // Fish on the left, settled.
  await page.evaluate((poses) => window.__vibe_test.setAllPoses(poses), LEFT_POSES);
  await page.evaluate((frames) => window.__vibe_test.waitForFrames(frames), SETTLE_FRAMES);
  const left = await capture(page, `${backend}-fish-left`, testInfo);

  // Move right and let the renderer settle; the left region must stay empty.
  await page.evaluate((poses) => window.__vibe_test.setAllPoses(poses), RIGHT_POSES);
  await page.evaluate((frames) => window.__vibe_test.waitForFrames(frames), SETTLE_FRAMES);
  const settled = await capture(page, `${backend}-settled`, testInfo);
  await page.evaluate((frames) => window.__vibe_test.waitForFrames(frames), STABILITY_GAP);
  const settledAgain = await capture(page, `${backend}-settled-again`, testInfo);

  await testInfo.attach(`${backend}-status`, {
    body: JSON.stringify(
      await page.evaluate(() => ({
        renderer: window.__vibe_rendererStatus,
        quality: window.__vibe_qualityStatus,
        render: window.__vibe_renderStatus,
      })),
      null,
      2
    ),
    contentType: 'application/json',
  });

  return { left, emptyRef, settled, settledAgain };
}

test.describe('renderer visual parity', () => {
  test.setTimeout(300_000);

  test('WebGL and WebGPU show no fish ghosts and comparable exposure', async ({
    page,
    context,
  }, testInfo) => {
    const webgl = await captureBackend(page, 'webgl', testInfo);
    const gpuPage = await context.newPage();
    const webgpu = await captureBackend(gpuPage, 'webgpu', testInfo);
    await gpuPage.close();

    const results: Record<string, number> = {};

    for (const [backend, shots] of Object.entries({ webgl, webgpu }) as Array<
      ['webgl' | 'webgpu', BackendCapture]
    >) {
      const leftFish = await regionRaw(shots.left, LEFT_REGION);
      const emptyRef = await regionRaw(shots.emptyRef, LEFT_REGION);
      const settled = await regionRaw(shots.settled, LEFT_REGION);
      const settledAgain = await regionRaw(shots.settledAgain, LEFT_REGION);

      const ghost = meanAbsDiff(settled, emptyRef);
      const presence = meanAbsDiff(settled, leftFish);
      const stability = meanAbsDiff(settled, settledAgain);

      results[`${backend}-ghost`] = ghost;
      results[`${backend}-presence`] = presence;
      results[`${backend}-stability`] = stability;

      // Fish left the left region: the settled frame resembles the empty
      // reference far more than it resembles the fish-present frame.
      expect(ghost, `${backend}: persistent ghost in vacated region`).toBeLessThan(
        Math.min(GHOST_ABS_MAX, presence * GHOST_RATIO_MAX)
      );
      expect(presence, `${backend}: fish never occupied the left region`).toBeGreaterThan(6);
      // Repeated settled frames must be temporally stable (no trailing copies).
      expect(stability, `${backend}: settled frames keep changing`).toBeLessThan(STABILITY_ABS_MAX);
    }

    const webglLum = await meanLuminance(webgl.settled, TANK_REGION);
    const webgpuLum = await meanLuminance(webgpu.settled, TANK_REGION);
    const relative = Math.abs(webgpuLum - webglLum) / Math.max(webglLum, webgpuLum);
    results['exposure-relative-delta'] = relative;

    testInfo.attach('parity-metrics', {
      body: JSON.stringify({ results, webglLum, webgpuLum }, null, 2),
      contentType: 'application/json',
    });

    expect(
      relative,
      `WebGPU/WebGL exposure mismatch: webgl=${webglLum.toFixed(1)} webgpu=${webgpuLum.toFixed(1)}`
    ).toBeLessThan(EXPOSURE_REL_MAX);
  });
});
