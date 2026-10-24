import * as THREE from 'three';
import { createRandom } from '../sim/random';

/**
 * Procedural canvas textures. Everything is generated once at start-up so the app ships no image
 * assets beyond the fish models, and every surface still has some material character.
 */
const cache = new Map<string, THREE.Texture>();
const originals = new WeakSet<THREE.Texture>();
const sources = new WeakSet<THREE.Source<unknown>>();

const memo = (key: string, build: () => THREE.Texture) => {
  let texture = cache.get(key);
  if (!texture) {
    texture = build();
    cache.set(key, texture);
    originals.add(texture);
    sources.add(texture.source);
  }
  return texture;
};

/**
 * A `clone()` of one of these textures shares its canvas but gets its own GPU texture, so the
 * material holding it disposes it. The originals stay cached for the life of the page.
 */
export const isTextureCopy = (texture: THREE.Texture) =>
  sources.has(texture.source) && !originals.has(texture);

const canvas2d = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
};

const finish = (canvas: HTMLCanvasElement, { srgb = true, repeat = true } = {}) => {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
};

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

/** Oak planks running front-to-back. One tile covers 2 m × 2 m. */
export const woodFloorTexture = () =>
  memo('wood', () => {
    const size = 1024;
    const { canvas, ctx } = canvas2d(size, size);
    const random = createRandom(11);
    const planks = 9;
    const plankWidth = size / planks;
    for (let p = 0; p < planks; p++) {
      let y = -random.range(0, size);
      while (y < size) {
        const length = random.range(size * 0.45, size * 0.95);
        const tone = random.range(-5, 5);
        ctx.fillStyle = hsl(28 + tone * 0.6, 38 + tone, 42 + tone);
        ctx.fillRect(p * plankWidth, y, plankWidth, length);
        // Grain: long wavy strokes, darker and lighter.
        for (let g = 0; g < 26; g++) {
          ctx.strokeStyle = random.next() > 0.5 ? hsl(25, 40, 30, 0.22) : hsl(32, 45, 58, 0.16);
          ctx.lineWidth = random.range(0.6, 2.2);
          ctx.beginPath();
          const x0 = p * plankWidth + random.range(2, plankWidth - 2);
          const wave = random.range(1, 4);
          const freq = random.range(0.004, 0.012);
          const phase = random.range(0, 6);
          for (let s = 0; s <= 24; s++) {
            const yy = y + (length * s) / 24;
            const xx = x0 + Math.sin(yy * freq + phase) * wave;
            if (s === 0) ctx.moveTo(xx, yy);
            else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
        if (random.next() > 0.6) {
          // Occasional knot.
          const kx = p * plankWidth + random.range(10, plankWidth - 10);
          const ky = y + random.range(20, length - 20);
          const knot = ctx.createRadialGradient(kx, ky, 0, kx, ky, random.range(4, 9));
          knot.addColorStop(0, hsl(22, 45, 22, 0.8));
          knot.addColorStop(1, hsl(22, 45, 30, 0));
          ctx.fillStyle = knot;
          ctx.fillRect(kx - 12, ky - 12, 24, 24);
        }
        ctx.fillStyle = 'rgba(30, 18, 10, 0.55)';
        ctx.fillRect(p * plankWidth, y + length - 1.5, plankWidth, 1.5);
        y += length;
      }
      ctx.fillStyle = 'rgba(30, 18, 10, 0.6)';
      ctx.fillRect(p * plankWidth, 0, 1.5, size);
    }
    return finish(canvas);
  });

/** Continuous walnut-style grain without plank seams, for furniture. Grain runs along u. */
export const woodGrainTexture = () =>
  memo('grain', () => {
    const size = 512;
    const { canvas, ctx } = canvas2d(size, size);
    const random = createRandom(17);
    ctx.fillStyle = hsl(26, 36, 44);
    ctx.fillRect(0, 0, size, size);
    for (let g = 0; g < 140; g++) {
      ctx.strokeStyle =
        random.next() > 0.45 ? hsl(22, 40, 26, random.range(0.08, 0.3)) : hsl(32, 45, 60, 0.12);
      ctx.lineWidth = random.range(0.6, 3);
      ctx.beginPath();
      const y0 = random.range(0, size);
      const wave = random.range(2, 9);
      const freq = random.range(0.004, 0.014);
      const phase = random.range(0, 6);
      for (let s = 0; s <= 40; s++) {
        const x = (size * s) / 40;
        const y = y0 + Math.sin(x * freq + phase) * wave + Math.sin(x * freq * 3.1) * wave * 0.25;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return finish(canvas);
  });

/** Near-white plaster noise; tint it with the material colour. */
export const plasterTexture = () =>
  memo('plaster', () => {
    const size = 512;
    const { canvas, ctx } = canvas2d(size, size);
    const random = createRandom(5);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i++) {
      const v = random.range(225, 255);
      ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.35)`;
      ctx.fillRect(
        random.range(0, size),
        random.range(0, size),
        random.range(1, 3),
        random.range(1, 3)
      );
    }
    return finish(canvas);
  });

/** Woven fabric, greyscale, tiles every ~10 cm. */
export const fabricTexture = () =>
  memo('fabric', () => {
    const size = 256;
    const { canvas, ctx } = canvas2d(size, size);
    const random = createRandom(3);
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        const over = ((x + y) / 4) % 2 === 0;
        const v = (over ? 235 : 196) + random.range(-14, 14);
        ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
        ctx.fillRect(x, y, over ? 4 : 3, over ? 3 : 4);
      }
    }
    return finish(canvas);
  });

/** A muted kilim-style rug. */
export const rugTexture = () =>
  memo('rug', () => {
    const w = 1024;
    const h = 704;
    const { canvas, ctx } = canvas2d(w, h);
    const random = createRandom(21);
    const field = '#b8a284';
    const ink = '#6e4b3a';
    const accent = '#4f6a63';
    const cream = '#e6dccb';
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, w, h);
    const border = 64;
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, w, border);
    ctx.fillRect(0, h - border, w, border);
    ctx.fillRect(0, 0, border, h);
    ctx.fillRect(w - border, 0, border, h);
    ctx.fillStyle = cream;
    for (let x = border; x < w - border; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, border / 2);
      ctx.lineTo(x + 16, border / 2 - 12);
      ctx.lineTo(x + 32, border / 2);
      ctx.lineTo(x + 16, border / 2 + 12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, h - border / 2);
      ctx.lineTo(x + 16, h - border / 2 - 12);
      ctx.lineTo(x + 32, h - border / 2);
      ctx.lineTo(x + 16, h - border / 2 + 12);
      ctx.fill();
    }
    const diamond = (cx: number, cy: number, rx: number, ry: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx - rx, cy);
      ctx.lineTo(cx, cy - ry);
      ctx.lineTo(cx + rx, cy);
      ctx.lineTo(cx, cy + ry);
      ctx.fill();
    };
    for (let i = 0; i < 3; i++) {
      const cx = w * (0.25 + i * 0.25);
      diamond(cx, h / 2, 120, 200, ink);
      diamond(cx, h / 2, 86, 150, accent);
      diamond(cx, h / 2, 48, 90, cream);
      diamond(cx, h / 2, 18, 34, ink);
    }
    // Wool texture: fine speckle.
    for (let i = 0; i < 26000; i++) {
      const v = random.next() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.05)`;
      ctx.fillRect(random.range(0, w), random.range(0, h), 2, 2);
    }
    return finish(canvas, { repeat: false });
  });

/** Fine aquarium sand with scattered darker grains and pebbles. */
export const sandTexture = () =>
  memo('sand', () => {
    const size = 512;
    const { canvas, ctx } = canvas2d(size, size);
    const random = createRandom(8);
    ctx.fillStyle = '#c9b48f';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 40000; i++) {
      const l = random.range(45, 82);
      ctx.fillStyle = hsl(36 + random.range(-8, 8), random.range(15, 35), l, 0.6);
      ctx.fillRect(random.range(0, size), random.range(0, size), 1.5, 1.5);
    }
    for (let i = 0; i < 260; i++) {
      const x = random.range(0, size);
      const y = random.range(0, size);
      const r = random.range(1.5, 4.5);
      ctx.fillStyle = hsl(30 + random.range(-10, 10), random.range(5, 20), random.range(30, 70));
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * random.range(0.6, 1), random.range(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    return finish(canvas);
  });

/** Driftwood bark: long fibres along v. */
export const barkTexture = () =>
  memo('bark', () => {
    const w = 128;
    const h = 512;
    const { canvas, ctx } = canvas2d(w, h);
    const random = createRandom(4);
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      ctx.strokeStyle = random.next() > 0.5 ? 'rgba(30, 20, 14, 0.5)' : 'rgba(140, 105, 75, 0.35)';
      ctx.lineWidth = random.range(1, 4);
      const x = random.range(0, w);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + random.range(-8, 8), h * 0.33, x + random.range(-8, 8), h * 0.66, x, h);
      ctx.stroke();
    }
    return finish(canvas);
  });

/** Frosted, backlit rear panel: bright in the lower middle, fading upwards. */
export const backdropTexture = () =>
  memo('backdrop', () => {
    const w = 256;
    const h = 128;
    const { canvas, ctx } = canvas2d(w, h);
    const glow = ctx.createRadialGradient(w / 2, h * 1.1, 10, w / 2, h * 0.9, w * 0.75);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.45, '#9fb8bf');
    glow.addColorStop(1, '#1b2a30');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    return finish(canvas, { repeat: false });
  });

/** Soft abstract painting for the wall. */
export const artTexture = () =>
  memo('art', () => {
    const w = 512;
    const h = 640;
    const { canvas, ctx } = canvas2d(w, h);
    ctx.fillStyle = '#ece4d6';
    ctx.fillRect(0, 0, w, h);
    const blob = (x: number, y: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    ctx.fillStyle = '#2f4f4f';
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    blob(w * 0.62, h * 0.38, 120, '#d9895b');
    blob(w * 0.3, h * 0.62, 90, '#7f9c8a');
    ctx.fillStyle = '#1f3134';
    ctx.fillRect(w * 0.18, h * 0.2, 14, h * 0.6);
    blob(w * 0.8, h * 0.78, 40, '#e9c46a');
    return finish(canvas, { repeat: false });
  });

/** Alpha-masked tree line seen through the window. */
export const treelineTexture = () =>
  memo('trees', () => {
    const w = 1024;
    const h = 512;
    const { canvas, ctx } = canvas2d(w, h);
    const random = createRandom(31);
    ctx.filter = 'blur(6px)';
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,1)';
      for (let i = 0; i < 26; i++) {
        const x = random.range(-40, w + 40);
        const base = h * (layer === 0 ? 0.55 : 0.75);
        const r = random.range(50, 120) * (layer === 0 ? 0.8 : 1);
        ctx.beginPath();
        ctx.ellipse(x, base - r * 0.6, r * 0.7, r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + r * 0.5, base - r * 1.1, r * 0.5, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - r * 0.7, base - r * 0.6, r * 1.4, h);
      }
    }
    return finish(canvas, { srgb: false, repeat: false });
  });

// Editing this module rebuilds the cache, so free the textures of the copy being replaced.
import.meta.hot?.dispose(() => {
  for (const texture of cache.values()) texture.dispose();
});
