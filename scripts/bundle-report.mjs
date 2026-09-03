import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const criticalModelName = 'Copilot3D-fish.glb';

function collectFiles(directory, extension, mapFile) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(extension))
    .map((name) => mapFile(name, path.join(directory, name)))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}

export function collectBundleReport(distDir) {
  const resolvedDistDir = path.resolve(distDir);
  const javascriptFiles = collectFiles(
    path.join(resolvedDistDir, 'assets'),
    '.js',
    (name, file) => {
      const contents = fs.readFileSync(file);
      return {
        name,
        rawBytes: contents.byteLength,
        gzipBytes: gzipSync(contents).byteLength,
      };
    }
  );
  const modelFiles = collectFiles(resolvedDistDir, '.glb', (name, file) => ({
    name,
    bytes: fs.statSync(file).size,
  }));
  const criticalModel = modelFiles.find((file) => file.name === criticalModelName);
  if (!criticalModel) {
    throw new Error(`Critical model ${criticalModelName} is missing from the bundle output.`);
  }

  return {
    javascript: {
      rawBytes: javascriptFiles.reduce((total, file) => total + file.rawBytes, 0),
      gzipBytes: javascriptFiles.reduce((total, file) => total + file.gzipBytes, 0),
      files: javascriptFiles,
    },
    models: {
      totalBytes: modelFiles.reduce((total, file) => total + file.bytes, 0),
      files: modelFiles,
    },
    criticalModel: {
      name: criticalModelName,
      bytes: criticalModel.bytes,
    },
  };
}

function formatBytes(bytes) {
  return bytes.toLocaleString('en-US');
}

function formatMarkdownTable(headers, rows) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length))
  );
  const align = (value, index) =>
    index === 0 ? value.padEnd(widths[index]) : value.padStart(widths[index]);

  return [
    `| ${headers.map(align).join(' | ')} |`,
    `| ${widths
      .map((width, index) => (index === 0 ? '-'.repeat(width) : `${'-'.repeat(width - 1)}:`))
      .join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(align).join(' | ')} |`),
  ].join('\n');
}

export function formatBundleReport(report) {
  const javascriptRows = [
    ...report.javascript.files.map((file) => [
      file.name,
      formatBytes(file.rawBytes),
      formatBytes(file.gzipBytes),
    ]),
    [
      '**Total**',
      `**${formatBytes(report.javascript.rawBytes)}**`,
      `**${formatBytes(report.javascript.gzipBytes)}**`,
    ],
  ];
  const modelRows = [
    ...report.models.files.map((file) => [file.name, formatBytes(file.bytes)]),
    ['**Total**', `**${formatBytes(report.models.totalBytes)}**`],
  ];

  return `# Asset transfer report

## Baseline

- Fish models: 4,173,384 raw bytes.
- Major JavaScript bundle: 1,409,849 gzip bytes.

## Optimization settings

- glTF Transform 4.5.0
- meshoptimizer 0.23.0
- sharp 0.35.4
- Meshopt compression level: high
- WebP quality: 82; effort: 6

## Post-build JavaScript

${formatMarkdownTable(['File', 'Raw bytes', 'Gzip bytes'], javascriptRows)}

## Post-build fish models

${formatMarkdownTable(['File', 'Raw bytes'], modelRows)}

Critical first model: **${report.criticalModel.name}** — **${formatBytes(report.criticalModel.bytes)} raw bytes**.
`;
}

function parseArguments(argumentsList) {
  const options = { dist: 'dist', output: undefined };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const option = argumentsList[index];
    if (option !== '--dist' && option !== '--output') {
      throw new Error(`Unknown option: ${option}`);
    }
    const value = argumentsList[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${option}`);
    }
    options[option.slice(2)] = value;
    index += 1;
  }

  return options;
}

function runCli() {
  const { dist, output } = parseArguments(process.argv.slice(2));
  const distDirectory = path.resolve(dist);
  if (!fs.existsSync(distDirectory)) {
    throw new Error(`${dist} does not exist. Run npm run build first.`);
  }

  const markdown = formatBundleReport(collectBundleReport(distDirectory));
  if (output) {
    const outputPath = path.resolve(output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown);
  }
  console.log(markdown);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  try {
    runCli();
  } catch (error) {
    console.error(
      `Bundle report failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}
