// Acesso ao painel do blog: endereço secreto + login com senha e código 2FA.
//
// Camadas de proteção (nesta ordem):
//   1. Endereço secreto (PAINEL_CAMINHO), definido só na Hostinger. Qualquer
//      outro endereço, inclusive /admin, responde 404.
//   2. Usuário + senha (hash scrypt) + código de 6 dígitos do app autenticador (TOTP).
//      Tentativas erradas bloqueiam o usuário e o IP por um tempo.
//   3. Sessão em cookie HttpOnly/Secure, válida por 8 horas.
//   4. Login do GitHub (só quem tem permissão de escrita no repositório publica).
//
// Variáveis de ambiente:
//   PAINEL_CAMINHO   ex.: /gestao-7k2m9q4x (mínimo 12 caracteres, letras, números e hífens)
//   PAINEL_USUARIOS  usuario:hash:segredo2fa, separados por vírgula
//                    (gere com: node scripts/criar-usuario-painel.js)
const crypto = require('crypto');
const { promisify } = require('util');
const { escapeHtml: e } = require('./blog');

const scrypt = promisify(crypto.scrypt);

const SESSION_COOKIE = '__Host-girassol_painel';
const SESSION_MS = 8 * 60 * 60 * 1000;
const MAX_FALHAS_USUARIO = 5;
const MAX_FALHAS_IP = 20;
const BLOQUEIO_MS = 15 * 60 * 1000;
const PATH_RE = /^\/[a-z0-9-]{12,64}$/i;

// ---------------------------------------------------------------- configuração

function lerConfig() {
  const caminho = (process.env.PAINEL_CAMINHO || '').trim().replace(/\/+$/, '');
  if (!caminho) return null;
  if (!PATH_RE.test(caminho) || /^\/(admin|painel|login|wp-admin|blog|api)/i.test(caminho)) {
    console.error('[painel] PAINEL_CAMINHO inválido: use algo como /gestao-7k2m9q4x (12+ caracteres, sem palavras óbvias). Painel desligado.');
    return null;
  }
  const usuarios = new Map();
  for (const item of (process.env.PAINEL_USUARIOS || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [nome, hash, totp] = item.split(':');
    if (nome && hash && hash.startsWith('scrypt$') && totp && /^[A-Z2-7]{16,}$/.test(totp)) {
      usuarios.set(nome.toLowerCase(), { nome, hash, totp });
    } else {
      console.error(`[painel] Usuário mal configurado em PAINEL_USUARIOS (ignorado): ${nome || '?'}`);
    }
  }
  if (!usuarios.size) {
    console.error('[painel] PAINEL_USUARIOS vazio: ninguém consegue entrar no painel.');
  }
  return { caminho, usuarios };
}

const config = lerConfig();

// ---------------------------------------------------------------- senha (scrypt)

async function hashSenha(senha) {
  const N = 32768, r = 8, p = 1;
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(senha.normalize('NFKC'), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

// Hash falso para usuários inexistentes: o tempo de resposta fica igual
const HASH_FALSO = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');

async function conferirSenha(senha, armazenado) {
  const [, N, r, p, saltB64, hashB64] = armazenado.split('$');
  const esperado = Buffer.from(hashB64, 'base64');
  const calculado = await scrypt(String(senha).normalize('NFKC'), Buffer.from(saltB64, 'base64'), esperado.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return crypto.timingSafeEqual(calculado, esperado);
}

// ---------------------------------------------------------------- 2FA (TOTP, RFC 6238)

function base32Decode(texto) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of texto.replace(/=+$/, '')) bits += alfabeto.indexOf(c).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function base32Encode(buffer) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const b of buffer) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += alfabeto[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}

function codigoTotp(segredo, passo) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(passo));
  const hmac = crypto.createHmac('sha1', base32Decode(segredo)).update(contador).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const numero = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(numero).padStart(6, '0');
}

const ultimoPassoUsado = new Map(); // impede reutilizar o mesmo código

function conferirTotp(usuario, codigo) {
  const limpo = String(codigo || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(limpo)) return false;
  const agora = Math.floor(Date.now() / 30000);
  for (const passo of [agora - 1, agora, agora + 1]) {
    const certo = Buffer.from(codigoTotp(usuario.totp, passo));
    if (crypto.timingSafeEqual(certo, Buffer.from(limpo)) && passo > (ultimoPassoUsado.get(usuario.nome) || 0)) {
      ultimoPassoUsado.set(usuario.nome, passo);
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- bloqueio por tentativas

const falhas = new Map(); // chave -> { count, until, first }

function bloqueado(chave) {
  const f = falhas.get(chave);
  return f && f.until > Date.now();
}

function registrarFalha(chave, limite) {
  const agora = Date.now();
  const f = falhas.get(chave);
  const atual = f && agora - f.first < BLOQUEIO_MS ? f : { count: 0, until: 0, first: agora };
  atual.count += 1;
  if (atual.count >= limite) atual.until = agora + BLOQUEIO_MS;
  falhas.set(chave, atual);
}

// Limpeza periódica para a memória não crescer
setInterval(() => {
  const agora = Date.now();
  for (const [k, f] of falhas) if (f.until < agora && agora - f.first > BLOQUEIO_MS) falhas.delete(k);
  for (const [k, s] of sessoes) if (s.expira < agora) sessoes.delete(k);
}, 10 * 60 * 1000).unref();

function ipDe(req) {
  return String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || '?').trim();
}

// ---------------------------------------------------------------- sessões

const sessoes = new Map(); // token -> { usuario, expira }

function lerCookie(req, nome) {
  for (const parte of String(req.headers.cookie || '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return v.join('=');
  }
  return null;
}

function sessaoAtual(req) {
  const token = lerCookie(req, SESSION_COOKIE);
  const s = token && sessoes.get(token);
  if (!s || s.expira < Date.now()) return null;
  return s;
}

function criarSessao(usuario) {
  const token = crypto.randomBytes(32).toString('base64url');
  sessoes.set(token, { usuario: usuario.nome, expira: Date.now() + SESSION_MS });
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MS / 1000}; HttpOnly; Secure; SameSite=Lax`;
}

function encerrarSessao(req) {
  const token = lerCookie(req, SESSION_COOKIE);
  if (token) sessoes.delete(token);
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// ---------------------------------------------------------------- páginas

const CSP_LOGIN = "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; script-src 'none'";

function paginaLogin({ erro = '', usuario = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Acesso restrito</title>
  <link rel="icon" type="image/webp" href="/ARQUIVOS/LOGOS/icone_girassol-removebg-preview.webp" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Sora:wght@500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.min.css" />
</head>
<body class="font-body min-h-screen bg-brand-dark text-white flex items-center justify-center px-5 py-10 relative overflow-hidden">
  <div class="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-48 -left-40 h-[30rem] w-[30rem] rounded-full bg-brand-navy blur-3xl"></div>
  <main class="relative w-full max-w-sm">
    <div class="flex justify-center mb-8">
      <img src="/ARQUIVOS/LOGOS/cor-total.webp" alt="Girassol Energia Solar" class="h-11 w-auto brightness-0 invert" />
    </div>
    <form method="post" action="${e(config.caminho)}/entrar" autocomplete="on" class="rounded-3xl border border-white/10 bg-white/[0.06] p-7 sm:p-8 shadow-2xl backdrop-blur-xl">
      <h1 class="font-display text-2xl font-semibold tracking-tight">Painel do blog</h1>
      <p class="mt-1 mb-6 text-sm text-white/60">Acesso restrito à equipe Girassol.</p>
      ${erro ? `<p role="alert" class="mb-5 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-100">${e(erro)}</p>` : ''}
      <label class="block text-xs font-semibold uppercase tracking-wider text-white/60" for="usuario">Usuário</label>
      <input id="usuario" name="usuario" required maxlength="64" autocomplete="username" autocapitalize="none" spellcheck="false" value="${e(usuario)}"
        class="mt-2 mb-4 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white placeholder-white/30 outline-none focus:border-accent focus:ring-2 focus:ring-accent/40" />
      <label class="block text-xs font-semibold uppercase tracking-wider text-white/60" for="senha">Senha</label>
      <input id="senha" name="senha" type="password" required maxlength="256" autocomplete="current-password"
        class="mt-2 mb-4 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/40" />
      <label class="block text-xs font-semibold uppercase tracking-wider text-white/60" for="codigo">Código do app autenticador</label>
      <input id="codigo" name="codigo" required inputmode="numeric" pattern="[0-9 ]{6,7}" maxlength="7" autocomplete="one-time-code" placeholder="000000"
        class="mt-2 mb-6 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center font-display text-xl tracking-[0.5em] text-white placeholder-white/25 outline-none focus:border-accent focus:ring-2 focus:ring-accent/40" />
      <button type="submit" class="w-full rounded-xl bg-accent py-3.5 font-display text-sm font-semibold text-brand-dark transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-accent/40">Entrar</button>
    </form>
    <p class="mt-6 text-center text-xs text-white/40">Tentativas erradas bloqueiam o acesso por 15 minutos.</p>
  </main>
</body>
</html>`;
}

function paginaSaida() {
  // Remove também o login do GitHub guardado pelo Decap CMS neste navegador
  const nonce = crypto.randomBytes(16).toString('base64');
  return {
    nonce,
    html: `<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Saindo…</title>
<p style="font-family:sans-serif">Saindo do painel…</p>
<script nonce="${nonce}">try{localStorage.removeItem('decap-cms-user');localStorage.removeItem('netlify-cms-user');}catch(e){}location.replace(${JSON.stringify(config ? config.caminho + '/' : '/')});</script></html>`,
  };
}

// ---------------------------------------------------------------- login (POST)

function lerFormulario(req, limite = 4096) {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', (chunk) => {
      corpo += chunk;
      if (corpo.length > limite) {
        reject(new Error('Formulário grande demais'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(new URLSearchParams(corpo)));
    req.on('error', reject);
  });
}

function mesmaOrigem(req) {
  const origem = req.headers.origin;
  if (!origem) return true; // navegadores antigos; o cookie SameSite ainda protege
  try {
    return new URL(origem).host === req.headers.host;
  } catch {
    return false;
  }
}

async function tentarLogin(req) {
  const ip = ipDe(req);
  if (!mesmaOrigem(req)) return { ok: false, erro: 'Requisição recusada.' };

  let form;
  try {
    form = await lerFormulario(req);
  } catch {
    return { ok: false, erro: 'Requisição recusada.' };
  }
  const nomeDigitado = String(form.get('usuario') || '').trim().slice(0, 64);
  const chaveUsuario = `u:${nomeDigitado.toLowerCase()}`;
  const chaveIp = `ip:${ip}`;

  if (bloqueado(chaveIp) || bloqueado(chaveUsuario)) {
    console.warn(`[painel] Tentativa durante bloqueio: usuário="${nomeDigitado}" ip=${ip}`);
    return { ok: false, erro: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.', usuario: nomeDigitado };
  }

  const usuario = config.usuarios.get(nomeDigitado.toLowerCase());
  const senhaOk = await conferirSenha(String(form.get('senha') || '').slice(0, 256), usuario ? usuario.hash : HASH_FALSO);
  const codigoOk = usuario && senhaOk && conferirTotp(usuario, form.get('codigo'));

  if (!usuario || !senhaOk || !codigoOk) {
    registrarFalha(chaveUsuario, MAX_FALHAS_USUARIO);
    registrarFalha(chaveIp, MAX_FALHAS_IP);
    console.warn(`[painel] Login recusado: usuário="${nomeDigitado}" ip=${ip}`);
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400)); // atrasa robôs
    return { ok: false, erro: 'Usuário, senha ou código incorretos.', usuario: nomeDigitado };
  }

  falhas.delete(chaveUsuario);
  console.log(`[painel] Login: usuário="${usuario.nome}" ip=${ip}`);
  return { ok: true, cookie: criarSessao(usuario) };
}

module.exports = {
  config,
  CSP_LOGIN,
  sessaoAtual,
  encerrarSessao,
  tentarLogin,
  paginaLogin,
  paginaSaida,
  hashSenha,
  base32Encode,
  codigoTotp,
};
