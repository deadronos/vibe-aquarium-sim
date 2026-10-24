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
const maxJavaScriptGzipBytes = parseThreshold('MAX_JS_GZIP_BYTES', 600_000);
const maxFirstPaintGzipBytes = parseThreshold('MAX_FIRST_PAINT_JS_GZIP_BYTES', 570_000);
const maxModelBytes = parseThreshold('MAX_MODEL_BYTES', 2_921_368);
const maxCriticalModelBytes = parseThreshold('MAX_CRITICAL_MODEL_BYTES', 960_000);

/**
 * Chunk names Vite emits, without the content hash. The hash itself can contain hyphens
 * (`react-Dboqm-dD.js`), so this matches a known name instead of splitting on `-`.
 * A name that is a prefix of another has to be listed after the longer one.
 */
const CHUNK_PREFIXES = [
  'rolldown-runtime',
  'postprocessing',
  'Effects',
  'three',
  'react',
  'index',
  'r3f',
];

/**
 * Package ownership that must stay true across minifier and library-version changes.
 * Extra helper packages are allowed; another vendor's library is not.
 */
const CHUNK_RULES = [
  {
    prefix: 'three',
    require: ['three'],
    forbid: [
      'postprocessing',
      '@react-three/postprocessing',
      '@react-three/fiber',
      '@react-three/drei',
      'react',
      'react-dom',
    ],
  },
  {
    prefix: 'postprocessing',
    require: ['postprocessing'],
    forbid: ['three', '@react-three/fiber', '@react-three/drei', 'react', 'react-dom'],
  },
  {
    prefix: 'react',
    require: ['react', 'react-dom'],
    forbid: ['three', 'postprocessing', '@react-three/fiber', '@react-three/drei'],
  },
  {
    prefix: 'r3f',
    require: ['@react-three/fiber', '@react-three/drei'],
    forbid: ['three', 'postprocessing', '@react-three/postprocessing'],
  },
  {
    prefix: 'index',
    require: ['app'],
    forbid: [
      'three',
      'postprocessing',
      '@react-three/postprocessing',
      '@react-three/fiber',
      '@react-three/drei',
      'react',
      'react-dom',
    ],
  },
  {
    prefix: 'Effects',
    require: ['app'],
    forbid: ['three', 'postprocessing', '@react-three/fiber', 'react', 'react-dom'],
  },
];

if (!fs.existsSync(distDir)) {
  console.error('Bundle budget check failed: dist/ does not exist. Run npm run build first.');
  process.exit(1);
}

const report = collectBundleReport(distDir);
const firstPaintGzipBytes = firstPaintJavaScriptGzip(distDir, report.javascript.files);

console.log(
  `Bundle budget: JavaScript ${report.javascript.gzipBytes} gzip bytes / ${maxJavaScriptGzipBytes} allowed`
);
console.log(
  `Bundle budget: first-paint JavaScript ${firstPaintGzipBytes} gzip bytes / ${maxFirstPaintGzipBytes} allowed`
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
if (firstPaintGzipBytes > maxFirstPaintGzipBytes) {
  console.error('First-paint JavaScript gzip budget exceeded.');
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

function chunkPrefix(fileName) {
  const base = path.basename(fileName, '.js');
  return CHUNK_PREFIXES.find((prefix) => base === prefix || base.startsWith(`${prefix}-`)) ?? null;
}

function firstPaintJavaScriptGzip(distDirectory, files) {
  const html = fs.readFileSync(path.join(distDirectory, 'index.html'), 'utf8');
  const names = new Set([...html.matchAll(/assets\/([^"']+\.js)/g)].map((match) => match[1]));
  return files
    .filter((file) => names.has(file.name))
    .reduce((total, file) => total + file.gzipBytes, 0);
}

function staticImports(source) {
  return [...source.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)].map(
    (match) => match[1]
  );
}

/** The named vendor chunks have to contain the libraries their names claim, and the post stack stays off the first-paint graph. */
function chunkLayoutMatchesNames(distDirectory, files) {
  const problems = [];
  const manifestPath = path.join(distDirectory, 'chunk-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Chunk layout check failed: dist/chunk-manifest.json is missing.');
    return false;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const packagesByPrefix = new Map();
  for (const [fileName, packages] of Object.entries(manifest)) {
    const prefix = chunkPrefix(fileName);
    if (!prefix) {
      problems.push(`unexpected chunk ${fileName}`);
      continue;
    }
    const existing = packagesByPrefix.get(prefix);
    if (existing) {
      problems.push(`expected one ${prefix} chunk`);
      continue;
    }
    packagesByPrefix.set(prefix, packages);
  }

  for (const rule of CHUNK_RULES) {
    const packages = packagesByPrefix.get(rule.prefix);
    if (!packages) {
      problems.push(`missing ${rule.prefix} chunk`);
      continue;
    }
    for (const required of rule.require) {
      if (!packages.includes(required))
        problems.push(`${rule.prefix} chunk is missing ${required}`);
    }
    for (const forbidden of rule.forbid) {
      if (packages.includes(forbidden)) problems.push(`${rule.prefix} chunk contains ${forbidden}`);
    }
  }

  const imports = new Map();
  for (const file of files) {
    const source = fs.readFileSync(path.join(distDirectory, 'assets', file.name), 'utf8');
    imports.set(
      file.name,
      staticImports(source).filter((imported) =>
        files.some((candidate) => candidate.name === imported)
      )
    );
  }
  const cycles = importCycles(imports);
  for (const cycle of cycles) problems.push(`chunks import each other: ${cycle.join(' -> ')}`);

  const html = fs.readFileSync(path.join(distDirectory, 'index.html'), 'utf8');
  const initialScripts = [...html.matchAll(/assets\/([^"']+\.js)/g)].map((match) => match[1]);
  for (const name of initialScripts) {
    const prefix = chunkPrefix(name);
    if (prefix === 'postprocessing' || prefix === 'Effects')
      problems.push(`first paint preloads ${name}`);
  }
  if (!initialScripts.some((name) => chunkPrefix(name) === 'three')) {
    problems.push('first paint does not load the three chunk');
  }

  if (problems.length > 0) {
    console.error('Chunk layout check failed:');
    for (const problem of problems) console.error(`- ${problem}`);
    return false;
  }

  console.log(
    'Chunk layout: three, react, r3f and postprocessing match their names; no chunk import cycles; the post stack is not preloaded.'
  );
  return true;
}

/** Directed cycles in the static chunk import graph. */
function importCycles(imports) {
  const cycles = [];
  const state = new Map();
  const stack = [];

  const visit = (name) => {
    state.set(name, 'visiting');
    stack.push(name);
    for (const imported of imports.get(name) ?? []) {
      const importedState = state.get(imported);
      if (importedState === 'visiting') {
        const start = stack.indexOf(imported);
        cycles.push([...stack.slice(start), imported]);
      } else if (importedState !== 'done') {
        visit(imported);
      }
    }
    stack.pop();
    state.set(name, 'done');
  };

  for (const name of imports.keys()) {
    if (!state.has(name)) visit(name);
  }
  return cycles;
}
