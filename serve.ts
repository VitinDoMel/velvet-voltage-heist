// Local static file server for testing Velvet & Voltage in desktop Chrome (Node 22 stdlib only).

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const portFlag = process.argv.indexOf('--port');
const parsedPort = portFlag !== -1 ? Number(process.argv[portFlag + 1]) : 8080;
const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536 ? parsedPort : 8080;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const reqUrl = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  let relPath: string;
  try {
    relPath = decodeURIComponent(reqUrl.pathname);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }

  if (relPath.endsWith('/')) relPath += 'index.html';
  const targetFile = resolve(join(gameRoot, normalize(relPath)));
  if (targetFile !== gameRoot && !targetFile.startsWith(gameRoot + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const stats = statSync(targetFile);
    if (!stats.isFile()) throw new Error('Not a regular file');
    const mime = CONTENT_TYPES[extname(targetFile).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, {
      'content-type': mime,
      'content-length': stats.size,
      'cache-control': 'no-store',
    });
    createReadStream(targetFile).pipe(res);
  } catch {
    res.writeHead(404).end('Not Found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Velvet & Voltage serving at http://127.0.0.1:${port}`);
});
