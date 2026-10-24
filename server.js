const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4'
};

// Só arquivos públicos do site são servidos (nada de server.js, package.json, .py, .git...)
const PUBLIC_FILES = new Set(['/giraindex.html', '/contatos.html', '/main.js', '/styles.min.css', '/robots.txt', '/sitemap.xml']);

const SECURITY_HEADERS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

function isPublic(urlPath) {
  return PUBLIC_FILES.has(urlPath) || urlPath.startsWith('/ARQUIVOS/');
}

function cacheControl(ext) {
  if (ext === '.html') return 'no-cache';
  if (ext === '.css' || ext === '.js') return 'public, max-age=86400';
  return 'public, max-age=2592000';
}

function sendFile(req, res, filePath, status) {
  const ext = path.extname(filePath).toLowerCase();
  const size = fs.statSync(filePath).size;
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl(ext),
    'Accept-Ranges': 'bytes'
  };

  // Suporte a Range: obrigatório para vídeos tocarem no iPhone/Safari
  const range = status === 200 && req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range) {
    let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
    let end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);
    if (start < 0) start = 0;
    if (start > end || start >= size) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.writeHead(status, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  let urlPath;
  try {
    urlPath = path.posix.normalize(decodeURIComponent(req.url.split('?')[0]));
  } catch {
    urlPath = '';
  }

  // Redireciona /giraindex.html para / (evita conteúdo duplicado no Google)
  if (urlPath === '/giraindex.html') {
    res.writeHead(301, { Location: '/' });
    return res.end();
  }
  if (urlPath === '/' || urlPath === '') urlPath = '/giraindex.html';

  const filePath = path.join(ROOT, urlPath);
  const insideRoot = filePath.startsWith(ROOT + path.sep);

  if (insideRoot && isPublic(urlPath) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return sendFile(req, res, filePath, 200);
  }

  // Página inexistente: mostra o site, mas com status 404 de verdade
  sendFile(req, res, path.join(ROOT, 'giraindex.html'), 404);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
