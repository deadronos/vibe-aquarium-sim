import fs from 'node:fs';
import path from 'node:path';
import { collectBundleReport } from './bundle-report.mjs';

function parseThreshold(environmentVariable, defaultValue) {
  const value = process.env[environmentVariable];
  if (value === undefined) return defaultValue;

  const threshold = Number(value);
  if (value.trim() === '' || !Number.isFinite(threshold) || threshold < 0) {
    throw new Error(`${environmentVariable} must be a finite, non-negative number.`);
  }
  return threshold;
}

const distDir = path.resolve('dist');
const maxJavaScriptGzipBytes = parseThreshold('MAX_JS_GZIP_BYTES', 1_700_000);
const maxModelBytes = parseThreshold('MAX_MODEL_BYTES', 2_921_368);
const maxCriticalModelBytes = parseThreshold('MAX_CRITICAL_MODEL_BYTES', 960_000);

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
if (!chunkLayoutMatchesNames(distDir, report.javascript.files)) {
  failed = true;
}

if (failed) process.exit(1);

/** The named vendor chunks have to contain the libraries their names claim, and the post stack stays off the first-paint graph. */
function chunkLayoutMatchesNames(distDirectory, files) {
  const problems = [];
  const readChunk = (prefix) => {
    const matches = files.filter((file) => file.name.startsWith(`${prefix}-`));
    if (matches.length !== 1) {
      problems.push(
        `expected one ${prefix} chunk, found ${matches.map((file) => file.name).join(', ') || 'none'}`
      );
      return '';
    }
    return fs.readFileSync(path.join(distDirectory, 'assets', matches[0].name), 'utf8');
  };

  const three = readChunk('three');
  const postprocessing = readChunk('postprocessing');
  const react = readChunk('react');
  const r3f = readChunk('r3f');
  readChunk('Effects');

  if (three && !three.includes('WebGLRenderer')) {
    problems.push('three chunk is missing WebGLRenderer');
  }
  if (three && (three.includes('EffectComposer') || three.includes('BloomEffect'))) {
    problems.push('three chunk contains the post-processing stack');
  }
  if (
    postprocessing &&
    !postprocessing.includes('EffectComposer') &&
    !postprocessing.includes('BloomEffect')
  ) {
    problems.push('postprocessing chunk is missing the post-processing stack');
  }
  if (
    postprocessing &&
    (postprocessing.includes('WebGLRenderer') || postprocessing.includes('WebGLShadowMap'))
  ) {
    problems.push('postprocessing chunk contains Three.js renderer code');
  }
  if (react && !react.includes('Minified React error')) {
    problems.push('react chunk is missing React');
  }
  if (r3f && !r3f.includes('@react-three/fiber') && !r3f.includes('react-reconciler')) {
    problems.push('r3f chunk is missing React Three Fiber');
  }

  const html = fs.readFileSync(path.join(distDirectory, 'index.html'), 'utf8');
  const initialScripts = [...html.matchAll(/assets\/([^"']+\.js)/g)].map((match) => match[1]);
  for (const name of initialScripts) {
    if (name.startsWith('postprocessing-') || name.startsWith('Effects-')) {
      problems.push(`first paint preloads ${name}`);
    }
  }
  if (!initialScripts.some((name) => name.startsWith('three-'))) {
    problems.push('first paint does not load the three chunk');
  }

  if (problems.length > 0) {
    console.error('Chunk layout check failed:');
    for (const problem of problems) console.error(`- ${problem}`);
    return false;
  }

  console.log(
    'Chunk layout: three, react, r3f and postprocessing match their names; the post stack is not preloaded.'
  );
  return true;
}
