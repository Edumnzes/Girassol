// Carrega e renderiza os posts do blog (arquivos Markdown em blog/posts/).
// Cada arquivo começa com um bloco YAML entre "---" (título, data, capa...)
// seguido do texto do artigo em Markdown.
const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const YAML = require('yaml');

const POSTS_DIR = path.join(__dirname, '..', 'blog', 'posts');
const CACHE_MS = 60 * 1000;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Só aceita links http(s), e-mail, telefone e caminhos internos.
function safeUrl(url) {
  const value = String(url ?? '').trim();
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#')) return value;
  return null;
}

function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Estado da conversão atual: sumário (h2/h3) e ids já usados nos subtítulos
let sumarioAtual = [];
let idsUsados = new Map();

// Markdown seguro: HTML cru é exibido como texto (protege contra scripts
// injetados, inclusive em textos gerados pelo robô de notícias).
const markdown = new Marked({
  gfm: true,
  renderer: {
    // Subtítulos ganham id (para o sumário e links diretos). "#" vira h2:
    // a página já tem o título do artigo como h1.
    heading({ tokens, depth, text }) {
      const nivel = Math.max(2, depth);
      const label = this.parser.parseInline(tokens);
      const base = slugify(text.replace(/[*_`[\]()]/g, '')) || 'secao';
      const n = (idsUsados.get(base) || 0) + 1;
      idsUsados.set(base, n);
      const id = n > 1 ? `${base}-${n}` : base;
      if (nivel <= 3) sumarioAtual.push({ id, nivel, html: label.replace(/<[^>]+>/g, '') });
      return `<h${nivel} id="${id}">${label}</h${nivel}>\n`;
    },
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const url = safeUrl(href);
      const label = this.parser.parseInline(tokens);
      if (!url) return label;
      const external = /^https?:/i.test(url) && !url.includes('girassolsolar.com');
      const attrs = external ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(url)}"${titleAttr}${attrs}>${label}</a>`;
    },
    image({ href, title, text }) {
      const url = safeUrl(href);
      if (!url) return '';
      const caption = title ? `<figcaption>${escapeHtml(title)}</figcaption>` : '';
      return `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy" decoding="async" />${caption}</figure>`;
    },
  },
});

function parseFile(file) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/^﻿/, '');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('bloco de informações (---) ausente');

  const data = YAML.parse(match[1]) || {};
  const slug = path.basename(file, '.md');
  if (!SLUG_RE.test(slug)) throw new Error('nome de arquivo inválido (use letras minúsculas, números e hífens)');
  if (!data.title || !data.date) throw new Error('título e data são obrigatórios');

  const date = new Date(data.date);
  if (Number.isNaN(date.getTime())) throw new Error('data inválida');

  const body = match[2].trim();
  sumarioAtual = [];
  idsUsados = new Map();
  const html = markdown.parse(body);
  const words = body.split(/\s+/).filter(Boolean).length;
  const sources = Array.isArray(data.sources)
    ? data.sources.filter((s) => s && s.url && safeUrl(s.url)).map((s) => ({ title: s.title || s.url, url: s.url }))
    : [];

  return {
    slug,
    url: `/blog/${slug}`,
    title: String(data.title),
    description: String(data.description || ''),
    date,
    updated: data.updated ? new Date(data.updated) : null,
    category: String(data.category || 'Notícias'),
    categorySlug: slugify(data.category || 'Notícias'),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    author: String(data.author || 'Equipe Girassol'),
    cover: safeUrl(data.cover),
    coverAlt: String(data.cover_alt || data.title),
    coverCredit: data.cover_credit ? String(data.cover_credit) : '',
    coverCreditUrl: safeUrl(data.cover_credit_url),
    sources,
    draft: data.draft === true,
    readingMinutes: Math.max(1, Math.round(words / 200)),
    html,
    toc: sumarioAtual,
  };
}

let cache = { at: 0, posts: [] };

// Lista de posts publicados, do mais novo para o mais antigo.
function getPosts() {
  if (Date.now() - cache.at < CACHE_MS) return cache.posts;

  const posts = [];
  const files = fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md')) : [];
  for (const file of files) {
    try {
      const post = parseFile(file);
      if (!post.draft && post.date <= new Date()) posts.push(post);
    } catch (err) {
      console.error(`[blog] Ignorando ${file}: ${err.message}`);
    }
  }
  posts.sort((a, b) => b.date - a.date);
  cache = { at: Date.now(), posts };
  return posts;
}

function getPost(slug) {
  return getPosts().find((p) => p.slug === slug) || null;
}

function formatDate(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Bahia' });
}

module.exports = { getPosts, getPost, escapeHtml, formatDate, slugify, SLUG_RE };
