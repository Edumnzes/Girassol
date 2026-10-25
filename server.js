// Servidor do site Girassol Energia Solar (Node.js, sem framework).
// Serve as páginas estáticas, o blog (blog/posts/*.md), o painel do blog
// (endereço secreto, ver lib/painel.js) e a API de avaliações. Rotas e variáveis de ambiente: veja o README.md.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const blog = require('./lib/blog');
const templates = require('./lib/templates');
const { getAvaliacoes } = require('./lib/avaliacoes');
const oauth = require('./lib/github-oauth');
const painel = require('./lib/painel');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const POSTS_PER_PAGE = 12;
const CANONICAL_HOST = new URL(templates.SITE_URL).host;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
};

// Só estes arquivos (e a pasta ARQUIVOS/) são públicos.
// Nada de server.js, package.json, .git, .env, lib/, robo/, painel/...
const PUBLIC_FILES = new Set(['/contatos.html', '/main.js', '/blog.js', '/styles.min.css', '/robots.txt']);

const CSP_SITE = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://code.iconify.design",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com",
  "media-src 'self'",
  "connect-src 'self' https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

// O Decap CMS (painel) roda no navegador e conversa direto com o GitHub
const CSP_ADMIN = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  // localhost:8081 = "npx decap-server", só para testar o painel no computador
  // blob:/data: = o Decap lê a imagem escolhida antes de enviá-la ao GitHub
  "connect-src 'self' blob: data: https://api.github.com https://*.githubusercontent.com https://unpkg.com http://localhost:8081",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

const COMPRESSIBLE = /^(text\/|application\/(json|xml|javascript)|image\/svg)/;

function isPainel(urlPath) {
  return Boolean(painel.config) && (urlPath === painel.config.caminho || urlPath.startsWith(painel.config.caminho + '/'));
}

function baseHeaders(urlPath) {
  if (isPainel(urlPath)) {
    return { ...SECURITY_HEADERS, 'Content-Security-Policy': CSP_ADMIN, 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
  }
  return { ...SECURITY_HEADERS, 'Content-Security-Policy': CSP_SITE };
}

function cacheControl(ext) {
  if (ext === '.html' || ext === '.xml' || ext === '.yml') return 'no-cache';
  if (ext === '.css' || ext === '.js') return 'public, max-age=86400';
  return 'public, max-age=2592000';
}

// Envia texto (HTML, XML, JSON...) com gzip/brotli quando o navegador aceita
function sendText(req, res, status, body, contentType, extra = {}) {
  const headers = { ...baseHeaders(req.urlPath), 'Content-Type': contentType, 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding', ...extra };
  let buffer = Buffer.from(body);
  const accept = String(req.headers['accept-encoding'] || '');
  if (buffer.length > 1024 && /\bbr\b/.test(accept)) {
    buffer = zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
    headers['Content-Encoding'] = 'br';
  } else if (buffer.length > 1024 && /\bgzip\b/.test(accept)) {
    buffer = zlib.gzipSync(buffer);
    headers['Content-Encoding'] = 'gzip';
  }
  headers['Content-Length'] = buffer.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : buffer);
}

function sendFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || 'application/octet-stream';
  // SVG pode conter scripts: é servido isolado, sem executar nada
  const extra = ext === '.svg' ? { 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox" } : {};
  if (COMPRESSIBLE.test(type)) {
    return sendText(req, res, 200, fs.readFileSync(filePath), type, { 'Cache-Control': cacheControl(ext), ...extra });
  }

  const size = fs.statSync(filePath).size;
  const headers = { ...baseHeaders(req.urlPath), 'Content-Type': type, 'Cache-Control': cacheControl(ext), 'Accept-Ranges': 'bytes' };

  // Suporte a Range: obrigatório para vídeos tocarem no iPhone/Safari
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range && (range[1] !== '' || range[2] !== '')) {
    let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
    const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);
    if (start < 0) start = 0;
    if (start > end || start >= size) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.writeHead(200, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

function redirect(res, location, status = 301) {
  res.writeHead(status, { Location: location });
  res.end();
}

function notFound(req, res) {
  sendText(req, res, 404, templates.notFoundPage(), MIME_TYPES['.html']);
}

// Página inicial: insere os posts mais recentes entre os marcadores do HTML
function renderHome() {
  const html = fs.readFileSync(path.join(ROOT, 'giraindex.html'), 'utf8');
  return html.replace(/<!-- blog:inicio -->[\s\S]*?<!-- blog:fim -->/, templates.homeBlogSection(blog.getPosts()));
}

async function handle(req, res) {
  // POST só existe no formulário de login do painel
  const isLoginPost = req.method === 'POST' && painel.config && req.url.split('?')[0] === painel.config.caminho + '/entrar';
  if (req.method !== 'GET' && req.method !== 'HEAD' && !isLoginPost) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  // www.girassolsolar.com -> girassolsolar.com (um só endereço para o Google)
  const host = String(req.headers.host || '');
  if (host === `www.${CANONICAL_HOST}`) return redirect(res, templates.SITE_URL + req.url);

  let url;
  try {
    url = new URL(req.url, 'http://localhost');
    req.urlPath = path.posix.normalize(decodeURIComponent(url.pathname));
  } catch {
    req.urlPath = '/';
    return notFound(req, res);
  }
  const p = req.urlPath;

  if (p === '/' || p === '/index.html') return sendText(req, res, 200, renderHome(), MIME_TYPES['.html']);
  if (p === '/giraindex.html') return redirect(res, '/');

  // Blog
  if (p === '/blog/' ) return redirect(res, '/blog' + url.search);
  if (p === '/blog') {
    const todos = blog.getPosts();
    const categorias = [];
    for (const post of todos) {
      const c = categorias.find((x) => x.slug === post.categorySlug);
      if (c) c.total += 1;
      else categorias.push({ slug: post.categorySlug, nome: post.category, total: 1 });
    }
    categorias.sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));

    const filtro = url.searchParams.get('categoria');
    const ativa = filtro ? categorias.find((c) => c.slug === filtro) : null;
    if (filtro && !ativa) return notFound(req, res);
    const posts = ativa ? todos.filter((x) => x.categorySlug === ativa.slug) : todos;

    const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
    const page = Number(url.searchParams.get('pagina') || 1);
    if (!Number.isInteger(page) || page < 1 || page > totalPages) return notFound(req, res);
    const slice = posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
    return sendText(req, res, 200, templates.blogIndex(slice, { page, totalPages, categorias, ativa }), MIME_TYPES['.html']);
  }
  if (p === '/blog/feed.xml') return sendText(req, res, 200, templates.rssFeed(blog.getPosts()), 'application/rss+xml; charset=utf-8');
  const postMatch = /^\/blog\/([^/]+)(\/?)$/.exec(p);
  if (postMatch) {
    if (postMatch[2]) return redirect(res, `/blog/${postMatch[1]}`);
    const post = blog.SLUG_RE.test(postMatch[1]) && blog.getPost(postMatch[1]);
    if (!post) return notFound(req, res);
    const related = blog.getPosts().filter((x) => x.slug !== post.slug).slice(0, 3);
    return sendText(req, res, 200, templates.postPage(post, related), MIME_TYPES['.html']);
  }

  if (p === '/sitemap.xml') return sendText(req, res, 200, templates.sitemap(blog.getPosts()), MIME_TYPES['.xml']);

  // API
  if (p === '/api/avaliacoes') {
    const data = await getAvaliacoes();
    if (!data) {
      res.writeHead(204, { ...baseHeaders(p), 'Cache-Control': 'public, max-age=3600' });
      return res.end();
    }
    return sendText(req, res, 200, JSON.stringify(data), MIME_TYPES['.json'], { 'Cache-Control': 'public, max-age=3600' });
  }
  // Painel do blog (endereço secreto). Sem PAINEL_CAMINHO, o painel não existe.
  if (isPainel(p)) return handlePainel(req, res, url);

  // Arquivos estáticos públicos
  const filePath = path.join(ROOT, p);
  const insideRoot = filePath.startsWith(ROOT + path.sep);
  const isPublic = PUBLIC_FILES.has(p) || p.startsWith('/ARQUIVOS/');
  if (insideRoot && isPublic && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return sendFile(req, res, filePath);
  }

  notFound(req, res);
}

async function handlePainel(req, res, url) {
  const base = painel.config.caminho;
  const sub = req.urlPath.slice(base.length);
  const html = MIME_TYPES['.html'];

  if (sub === '') return redirect(res, base + '/', 302);

  if (sub === '/entrar' && req.method === 'POST') {
    const resultado = await painel.tentarLogin(req);
    if (resultado.ok) {
      res.writeHead(303, { Location: base + '/', 'Set-Cookie': resultado.cookie, 'Cache-Control': 'no-store' });
      return res.end();
    }
    return sendText(req, res, 401, painel.paginaLogin(resultado), html, { 'Content-Security-Policy': painel.CSP_LOGIN, 'Cache-Control': 'no-store' });
  }

  if (sub === '/sair') {
    const { html: pagina, nonce } = painel.paginaSaida();
    return sendText(req, res, 200, pagina, html, {
      'Set-Cookie': painel.encerrarSessao(req),
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'`,
      'Cache-Control': 'no-store',
    });
  }

  const sessao = painel.sessaoAtual(req);
  if (sub === '/') {
    if (!sessao) {
      return sendText(req, res, 200, painel.paginaLogin(), html, { 'Content-Security-Policy': painel.CSP_LOGIN, 'Cache-Control': 'no-store' });
    }
    return sendText(req, res, 200, fs.readFileSync(path.join(ROOT, 'painel', 'index.html')), html, { 'Cache-Control': 'no-store' });
  }

  // Daqui para baixo, tudo exige sessão ativa
  if (!sessao) return notFound(req, res);
  if (sub === '/config.yml') {
    const yml = fs.readFileSync(path.join(ROOT, 'painel', 'config.yml'), 'utf8').replace(/__PAINEL__/g, base.slice(1));
    return sendText(req, res, 200, yml, MIME_TYPES['.yml'], { 'Cache-Control': 'no-store' });
  }
  if (sub === '/auth') return oauth.handleAuth(req, res, url);
  if (sub === '/auth/callback') return oauth.handleCallback(req, res, url);
  notFound(req, res);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erro interno');
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
