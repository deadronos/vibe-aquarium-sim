import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const distDir = path.resolve('dist');
const maxJavaScriptGzipBytes = Number(process.env.MAX_JS_GZIP_BYTES ?? 1_700_000);
const maxModelBytes = Number(process.env.MAX_MODEL_BYTES ?? 5_000_000);

if (!fs.existsSync(distDir)) {
  console.error('Bundle budget check failed: dist/ does not exist. Run npm run build first.');
  process.exit(1);
}

const assetsDir = path.join(distDir, 'assets');
const javascriptFiles = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((file) => file.endsWith('.js'))
  : [];
const javascriptGzipBytes = javascriptFiles.reduce((total, file) => {
  const contents = fs.readFileSync(path.join(assetsDir, file));
  return total + gzipSync(contents).byteLength;
}, 0);

const modelFiles = fs.readdirSync(distDir).filter((file) => file.endsWith('.glb'));
const modelBytes = modelFiles.reduce(
  (total, file) => total + fs.statSync(path.join(distDir, file)).size,
  0
);

console.log(
  `Bundle budget: JavaScript ${javascriptGzipBytes} gzip bytes / ${maxJavaScriptGzipBytes} allowed`
);
console.log(`Bundle budget: models ${modelBytes} bytes / ${maxModelBytes} allowed`);

let failed = false;
if (javascriptGzipBytes > maxJavaScriptGzipBytes) {
  console.error('JavaScript gzip budget exceeded.');
  failed = true;
}
if (modelBytes > maxModelBytes) {
  console.error('Model asset budget exceeded.');
  failed = true;
}

if (failed) process.exit(1);
