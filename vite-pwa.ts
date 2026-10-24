import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Plugin, ResolvedConfig } from 'vite';

/**
 * Makes the app installable and usable offline without a PWA framework: a web app manifest,
 * icons rasterised from `public/favicon.svg` at build time (no image files are committed), and a
 * small hand-written service worker (`pwa/service-worker.js`) that precaches this build.
 *
 * Every URL is relative to Vite's `base`, so the same build works at `/` and on the Pages sub-path.
 */

const NAME = 'Vibe Aquarium';
const DESCRIPTION = 'A cozy living-room aquarium you can sit and watch.';
const BACKGROUND = '#15120f';
const MANIFEST = 'manifest.webmanifest';
const SERVICE_WORKER = 'sw.js';

/** The favicon without its rounded tile, drawn on a full-bleed tile inside the maskable safe zone. */
const maskableSvg = (favicon: string) => {
  const inner = favicon.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  const tile = inner?.match(/<rect[^>]*fill="([^"]+)"[^>]*\/>/);
  if (!inner || !tile) throw new Error('vite-pwa: favicon.svg no longer has a background <rect>');
  // Maskable icons may be cropped to a circle of 80% diameter; the fish fits in 70%.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${tile[1]}"/><g transform="translate(9.6 9.6) scale(0.7)">${inner.replace(tile[0], '')}</g></svg>`;
};

const rasterise = (svg: string, size: number) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 64) })
    .resize(size, size)
    .png()
    .toBuffer();

const ICONS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
] as const;

const manifest = () =>
  JSON.stringify(
    {
      name: NAME,
      short_name: 'Aquarium',
      description: DESCRIPTION,
      // Relative to the manifest, which sits at `base`.
      id: './',
      start_url: './',
      scope: './',
      display: 'standalone',
      display_override: ['fullscreen', 'standalone'],
      orientation: 'any',
      background_color: BACKGROUND,
      theme_color: BACKGROUND,
      icons: [
        { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ...ICONS.filter((icon) => icon.file.startsWith('icon-')).map((icon) => ({
          src: icon.file,
          sizes: `${icon.size}x${icon.size}`,
          type: 'image/png',
          purpose: icon.maskable ? 'maskable' : 'any',
        })),
      ],
    },
    null,
    2
  );

const generatedFiles = async (publicDir: string) => {
  const favicon = readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');
  const files = new Map<string, string | Buffer>([[MANIFEST, manifest()]]);
  for (const icon of ICONS) {
    files.set(
      icon.file,
      await rasterise(icon.maskable ? maskableSvg(favicon) : favicon, icon.size)
    );
  }
  return files;
};

const listFiles = (dir: string, prefix = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`]
  );

export const pwa = (): Plugin => {
  let config: ResolvedConfig;
  let devFiles: Promise<Map<string, string | Buffer>> | null = null;

  return {
    name: 'pwa',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml() {
      const href = (file: string) => `${config.base}${file}`;
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: href(MANIFEST) }, injectTo: 'head' },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: href('apple-touch-icon.png') },
          injectTo: 'head',
        },
      ];
    },
    // The manifest and icons in dev too, so installability can be checked without a build.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '';
        if (!pathname.startsWith(config.base)) return next();
        const name = pathname.slice(config.base.length);
        devFiles ??= generatedFiles(config.publicDir);
        void devFiles.then((files) => {
          const body = files.get(name);
          if (body === undefined) return next();
          res.setHeader(
            'Content-Type',
            name === MANIFEST ? 'application/manifest+json' : 'image/png'
          );
          res.end(body);
        }, next);
      });
    },
    async generateBundle(_options, bundle) {
      const generated = await generatedFiles(config.publicDir);
      for (const [fileName, source] of generated)
        this.emitFile({ type: 'asset', fileName, source });

      const built = Object.keys(bundle).filter(
        (file) => !file.startsWith('.vite/') && !file.endsWith('.map') && file !== 'index.html'
      );
      const publicFiles = config.publicDir ? listFiles(config.publicDir) : [];
      // './' is the page itself; the worker stores it under that URL.
      const precache = [...new Set(['./', ...built, ...publicFiles, ...generated.keys()])].sort();

      // Built names are content hashed; public files are not, so their contents go in too.
      const hash = createHash('sha256').update(precache.join('\n'));
      for (const file of publicFiles) hash.update(readFileSync(path.join(config.publicDir, file)));
      const version = hash.digest('hex').slice(0, 12);

      const worker = readFileSync(path.resolve(config.root, 'pwa/service-worker.js'), 'utf8')
        .replace("'__PWA_VERSION__'", JSON.stringify(version))
        .replace('__PWA_PRECACHE__', JSON.stringify(precache));
      this.emitFile({ type: 'asset', fileName: SERVICE_WORKER, source: worker });
    },
  };
};
