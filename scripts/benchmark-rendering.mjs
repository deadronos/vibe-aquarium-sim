import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const baseUrl = process.env.BENCHMARK_URL ?? 'http://127.0.0.1:5175/vibe-aquarium-sim/';
const viewport = {
  width: Number(process.env.BENCHMARK_WIDTH ?? 390),
  height: Number(process.env.BENCHMARK_HEIGHT ?? 844),
};
const qualities = (process.env.BENCHMARK_QUALITIES ?? 'high,medium,low').split(',');
const server = process.env.BENCHMARK_URL
  ? null
  : spawn(process.execPath, ['scripts/serve-dist-with-base.js'], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });

const waitForServer = async () => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch {
      // The server may still be binding.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Benchmark server did not start at ${baseUrl}`);
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: process.env.BENCHMARK_HEADLESS !== 'false',
    args:
      process.platform === 'linux'
        ? [
            '--enable-features=Vulkan',
            '--use-angle=vulkan',
            '--use-vulkan=swiftshader',
            '--disable-vulkan-surface',
          ]
        : [],
  });
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const results = [];
  for (const requestedQuality of qualities) {
    const page = await context.newPage();
    const framebufferWarnings = [];
    page.on('console', (message) => {
      const text = message.text();
      if (
        /GL_INVALID_OPERATION.*glBlitFramebuffer|glBlitFramebuffer.*GL_INVALID_OPERATION/.test(text)
      ) {
        framebufferWarnings.push(text);
      }
    });
    await page.goto(
      `${baseUrl}?quality=${requestedQuality === 'high' ? 'high' : requestedQuality === 'medium' ? 'medium' : 'lite'}&profile=1`
    );
    await page.waitForFunction(
      () => document.querySelector('.loading')?.classList.contains('loading--done'),
      undefined,
      { timeout: 90_000 }
    );
    await page.waitForTimeout(10_000);
    await page.evaluate(() => window.__vibeResetRenderProfile?.());
    await page.waitForFunction(() => window.__vibeRenderProfile?.frames >= 120, undefined, {
      timeout: 90_000,
    });
    const sample = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      return {
        profile: window.__vibeRenderProfile,
        environment: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          renderer: debug ? gl?.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'masked',
        },
      };
    });
    results.push({
      requestedQuality,
      ...sample.profile,
      viewport,
      ...sample.environment,
      framebufferWarnings: framebufferWarnings.length,
    });
    await page.close();
  }
  await context.close();
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2));
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
