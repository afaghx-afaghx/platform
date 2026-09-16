import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');

function config() {
  return { port: Number(process.env.PORT || 3000), host: process.env.HOST || '127.0.0.1' };
}

function securityHeaders() {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://api.afaghx.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...securityHeaders() });
  res.end(JSON.stringify(body));
}

function safeFile(pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const normalized = normalize(requested).replace(/^([.][.][/\\])+/, '');
  const file = join(PUBLIC, normalized);
  return file.startsWith(PUBLIC) ? file : null;
}

async function staticFile(res, pathname) {
  const file = safeFile(pathname);
  if (!file) return false;
  try {
    const data = await readFile(file);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', ...securityHeaders() });
    res.end(data);
    return true;
  } catch { return false; }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      // Experience is a presentation shell. Authentication and business APIs belong exclusively to api.afaghx.com.
      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'canonical_api_only' });
      if (!(await staticFile(res, url.pathname))) return json(res, 404, { error: 'not_found' });
    } catch { return json(res, 500, { error: 'internal_error' }); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfg = config();
  createServer().listen(cfg.port, cfg.host, () => console.log(`AFAGHX experience shell listening on http://${cfg.host}:${cfg.port}`));
}
