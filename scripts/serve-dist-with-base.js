import http from 'http';
import fs from 'fs';
import path from 'path';

const port = process.env.PORT || 5175;
const base = '/vibe-aquarium-sim';
const dist = path.resolve(process.cwd(), 'dist');

function sendFileSafe(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.statusCode = 200;
    if (contentType) res.setHeader('Content-Type', contentType);
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  try {
    if (!req.url.startsWith(base)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const urlPath = req.url.slice(base.length) || '/';
    let filePath = path.join(dist, urlPath);
    if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html');

    // Prevent directory traversal
    if (!filePath.startsWith(dist)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.wasm': 'application/wasm',
    }[ext];

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for SPA routes
        sendFileSafe(res, path.join(dist, 'index.html'), 'text/html');
        return;
      }
      sendFileSafe(res, filePath, contentType);
    });
  } catch (e) {
    res.statusCode = 500;
    res.end('Server error');
  }
});

server.listen(port, () => {
  console.log(`Serving dist at http://localhost:${port}${base}`);
});
