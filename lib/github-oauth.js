// Login do GitHub dentro do painel do blog.
// O Decap CMS abre uma janela em <PAINEL_CAMINHO>/auth; o GitHub devolve para
// <PAINEL_CAMINHO>/auth/callback, que troca o código por um token e o entrega
// à janela do painel. As duas rotas só funcionam com a sessão do painel ativa
// (ver lib/painel.js). Precisa de GITHUB_OAUTH_CLIENT_ID e
// GITHUB_OAUTH_CLIENT_SECRET (ver docs/painel-do-blog.md).
const crypto = require('crypto');
const { SITE_URL } = require('./templates');
const painel = require('./painel');

const ALLOWED_SCOPES = new Set(['public_repo', 'repo']);
const STATE_COOKIE = 'girassol_oauth_state';

function isEnabled() {
  return Boolean(process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET);
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header || '')
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k, v]) => k && v)
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}

function sendPage(res, status, script, nonce) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'`,
  });
  res.end(`<!DOCTYPE html><meta charset="utf-8"><title>Login</title><p>Conectando ao painel…</p><script nonce="${nonce}">${script}</script>`);
}

// Mensagem no formato que o Decap CMS espera, enviada só para o próprio site
function messageScript(status, payload) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return `(function () {
    var origin = ${JSON.stringify(SITE_URL)};
    if (location.origin !== origin) origin = location.origin;
    function receive(e) {
      if (e.origin !== origin) return;
      window.opener.postMessage(${JSON.stringify(message)}, origin);
      window.removeEventListener('message', receive);
    }
    window.addEventListener('message', receive);
    window.opener.postMessage('authorizing:github', origin);
  })();`.replace(/</g, '\\u003c');
}

function redirectUri() {
  return `${SITE_URL}${painel.config.caminho}/auth/callback`;
}

function handleAuth(req, res, url) {
  if (!isEnabled()) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Login do painel ainda não configurado. Veja docs/painel-do-blog.md.');
  }
  const scope = ALLOWED_SCOPES.has(url.searchParams.get('scope')) ? url.searchParams.get('scope') : 'public_repo';
  const state = crypto.randomBytes(24).toString('hex');
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', process.env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', redirectUri());
  authorize.searchParams.set('scope', scope);
  authorize.searchParams.set('state', state);
  res.writeHead(302, {
    Location: authorize.toString(),
    'Set-Cookie': `${STATE_COOKIE}=${state}; Path=${painel.config.caminho}/auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    'Cache-Control': 'no-store',
  });
  res.end();
}

async function handleCallback(req, res, url) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const fail = (msg) => sendPage(res, 401, messageScript('error', { message: msg }), nonce);
  if (!isEnabled()) return fail('Login não configurado');

  const state = url.searchParams.get('state') || '';
  const expected = parseCookies(req.headers.cookie)[STATE_COOKIE] || '';
  const valid =
    state.length === expected.length && state.length > 0 && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expected));
  if (!valid) return fail('Sessão de login expirada. Tente de novo.');

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code: url.searchParams.get('code'),
        redirect_uri: redirectUri(),
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await tokenRes.json();
    if (!data.access_token) return fail(data.error_description || 'GitHub recusou o login');
    res.setHeader('Set-Cookie', `${STATE_COOKIE}=; Path=${painel.config.caminho}/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    sendPage(res, 200, messageScript('success', { token: data.access_token, provider: 'github' }), nonce);
  } catch (err) {
    console.error(`[oauth] ${err.message}`);
    fail('Não foi possível falar com o GitHub agora');
  }
}

module.exports = { handleAuth, handleCallback };
