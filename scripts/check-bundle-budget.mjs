import fs from 'node:fs';
import path from 'node:path';
import { collectBundleReport } from './bundle-report.mjs';

const distDir = path.resolve('dist');
const maxJavaScriptGzipBytes = Number(process.env.MAX_JS_GZIP_BYTES ?? 1_700_000);
const maxModelBytes = Number(process.env.MAX_MODEL_BYTES ?? 2_921_368);
const maxCriticalModelBytes = Number(process.env.MAX_CRITICAL_MODEL_BYTES ?? 960_000);

if (!fs.existsSync(distDir)) {
  console.error('Bundle budget check failed: dist/ does not exist. Run npm run build first.');
  process.exit(1);
}

const report = collectBundleReport(distDir);

console.log(
  `Bundle budget: JavaScript ${report.javascript.gzipBytes} gzip bytes / ${maxJavaScriptGzipBytes} allowed`
);
console.log(`Bundle budget: models ${report.models.totalBytes} bytes / ${maxModelBytes} allowed`);
console.log(
  `Bundle budget: critical model ${report.criticalModel.name} ${report.criticalModel.bytes} bytes / ${maxCriticalModelBytes} allowed`
);

let failed = false;
if (report.javascript.gzipBytes > maxJavaScriptGzipBytes) {
  console.error('JavaScript gzip budget exceeded.');
  failed = true;
}
if (report.models.totalBytes > maxModelBytes) {
  console.error('Model asset budget exceeded.');
  failed = true;
}
if (report.criticalModel.bytes > maxCriticalModelBytes) {
  console.error('Critical model asset budget exceeded.');
  failed = true;
}

if (failed) process.exit(1);
