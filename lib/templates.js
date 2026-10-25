// HTML das páginas do blog (listagem, artigo, 404) e dos cards da página inicial.
// Todo texto vindo dos posts passa por escapeHtml; só o corpo do artigo e o
// sumário (já higienizados em lib/blog.js) entram como HTML.
const { escapeHtml: e, formatDate } = require('./blog');

const SITE_URL = (process.env.SITE_URL || 'https://girassolsolar.com').replace(/\/$/, '');
const SITE_NAME = 'Girassol Energia Solar';
const DEFAULT_IMAGE = `${SITE_URL}/ARQUIVOS/IMAGENS/house_solar_simple.webp`;
const ICONE = '/ARQUIVOS/LOGOS/icone_girassol-removebg-preview.webp';

function absolute(url) {
  if (!url) return DEFAULT_IMAGE;
  return url.startsWith('/') ? SITE_URL + url : url;
}

function jsonLd(data) {
  // Evita que "</script>" dentro de um título feche a tag antes da hora
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

// ---------------------------------------------------------------- estrutura da página

function layout({ title, description, path, image, type = 'website', schema = [], body, noindex = false, scripts = [] }) {
  const canonical = SITE_URL + path;
  return `<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}" />
  ${noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${e(canonical)}" />`}
  <meta name="theme-color" content="#0a1526" />
  <link rel="icon" type="image/webp" href="${ICONE}" />
  <link rel="apple-touch-icon" href="${ICONE}" />
  <link rel="alternate" type="application/rss+xml" title="Blog ${SITE_NAME}" href="/blog/feed.xml" />
  <meta property="og:type" content="${type}" />
  <meta property="og:url" content="${e(canonical)}" />
  <meta property="og:title" content="${e(title)}" />
  <meta property="og:description" content="${e(description)}" />
  <meta property="og:image" content="${e(absolute(image))}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${e(title)}" />
  <meta name="twitter:description" content="${e(description)}" />
  <meta name="twitter:image" content="${e(absolute(image))}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
  <link rel="stylesheet" href="/styles.min.css" />
  ${schema.map(jsonLd).join('\n  ')}
</head>
<body class="font-body bg-brand-gray text-brand-dark overflow-x-hidden antialiased">
  <a href="#conteudo" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold">Pular para o conteúdo</a>
  <nav id="navbar" class="fixed top-0 z-[90] w-full bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 transition-all duration-300 md:px-12 xl:px-20 shadow-sm">
    <div class="mx-auto flex max-w-[1400px] items-center justify-between">
      <a href="/" class="z-10 flex items-center">
        <img src="/ARQUIVOS/LOGOS/cor-total.webp" alt="${SITE_NAME}" class="h-7 min-[360px]:h-8 sm:h-10 md:h-12 w-auto object-contain" />
      </a>
      <div class="font-body z-10 hidden items-center gap-8 lg:flex">
        <a href="/" class="text-[15px] font-medium text-brand-dark/80 hover:text-accent transition-colors">Início</a>
        <a href="/#como-funciona" class="text-[15px] font-medium text-brand-dark/80 hover:text-accent transition-colors">Como funciona</a>
        <a href="/#depoimentos" class="text-[15px] font-medium text-brand-dark/80 hover:text-accent transition-colors">Resultados</a>
        <a href="/blog" class="text-[15px] font-semibold text-brand-dark hover:text-accent transition-colors" aria-current="page">Blog</a>
      </div>
      <a href="/contatos.html" class="font-display z-10 flex items-center gap-2 shrink-0 whitespace-nowrap rounded bg-accent px-3 min-[360px]:px-4 py-2 md:px-6 md:py-2.5 text-[11px] md:text-[13px] font-semibold tracking-wide text-brand-dark transition-all duration-300 hover:brightness-110 uppercase">
        Fale conosco <iconify-icon icon="solar:arrow-right-linear" class="text-base"></iconify-icon>
      </a>
    </div>
  </nav>

  <a href="/contatos.html" class="pulse-ring fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full bg-accent p-4 text-brand-dark shadow-cta md:hidden" aria-label="Falar no WhatsApp">
    <iconify-icon icon="mdi:whatsapp" class="text-2xl"></iconify-icon>
  </a>

  <main id="conteudo" class="pt-16 sm:pt-[72px] md:pt-20">
${body}
  </main>

  <footer class="border-t border-white/10 bg-brand-dark px-6 py-12 text-center md:px-12 md:text-left xl:px-20">
    <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
      <img src="/ARQUIVOS/LOGOS/cor-total.webp" alt="${SITE_NAME}" class="h-10 md:h-12 w-auto object-contain brightness-0 invert opacity-90" />
      <div class="font-body text-xs tracking-wider text-white/40">
        © ${new Date().getFullYear()} GIRASSOL ENERGIA SOLAR. CNPJ: 41.564.038/0001-74. TODOS OS DIREITOS RESERVADOS.
      </div>
    </div>
  </footer>
  <script src="/main.js"></script>
  ${scripts.map((src) => `<script src="${src}" defer></script>`).join('\n  ')}
</body>
</html>`;
}

// ---------------------------------------------------------------- peças reutilizáveis

function categoriaUrl(post) {
  return `/blog?categoria=${encodeURIComponent(post.categorySlug)}`;
}

// Fotos do Unsplash aceitam largura na URL: o navegador baixa só o tamanho necessário
function srcset(url, larguras) {
  if (!/^https:\/\/(images|plus)\.unsplash\.com\//.test(url)) return '';
  const comLargura = (w) => (/[?&]w=\d+/.test(url) ? url.replace(/([?&])w=\d+/, `$1w=${w}`) : `${url}${url.includes('?') ? '&' : '?'}w=${w}`);
  return larguras.map((w) => `${e(comLargura(w))} ${w}w`).join(', ');
}

function capa(post, classes, sizes = '(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw') {
  if (post.cover) {
    const set = srcset(post.cover, [480, 800, 1200]);
    const responsivo = set ? ` srcset="${set}" sizes="${sizes}"` : '';
    return `<img src="${e(post.cover)}"${responsivo} alt="${e(post.coverAlt)}" loading="lazy" decoding="async" class="${classes}" />`;
  }
  return `<div class="${classes} bg-brand-navy flex items-center justify-center"><iconify-icon icon="solar:sun-2-bold-duotone" class="text-6xl text-accent"></iconify-icon></div>`;
}

function meta(post, { claro = false } = {}) {
  const cor = claro ? 'text-white/60' : 'text-gray-500';
  return `<span class="inline-flex items-center gap-1.5 ${cor}"><iconify-icon icon="solar:calendar-linear"></iconify-icon><time datetime="${post.date.toISOString()}">${formatDate(post.date)}</time></span>
          <span class="inline-flex items-center gap-1.5 ${cor}"><iconify-icon icon="solar:clock-circle-linear"></iconify-icon>${post.readingMinutes} min de leitura</span>`;
}

function postCard(post, { reveal = false, delay = '' } = {}) {
  return `
        <article class="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl${reveal ? ' reveal' : ''}${delay ? ' ' + delay : ''}">
          <div class="relative aspect-[16/10] overflow-hidden">
            ${capa(post, 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105')}
            <span class="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-wider text-brand-dark shadow-sm">${e(post.category)}</span>
          </div>
          <div class="flex flex-1 flex-col p-6">
            <h3 class="font-display text-xl font-semibold leading-snug text-brand-dark transition-colors group-hover:text-accent-hover line-clamp-2">
              <a href="${e(post.url)}" class="after:absolute after:inset-0">${e(post.title)}</a>
            </h3>
            <p class="mt-3 mb-6 font-body text-sm leading-relaxed text-gray-600 line-clamp-3">${e(post.description)}</p>
            <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-4 text-xs">
              ${meta(post)}
            </div>
          </div>
        </article>`;
}

function destaque(post) {
  return `
      <article class="group relative grid overflow-hidden rounded-3xl bg-white shadow-xl shadow-brand-dark/10 md:grid-cols-5">
        <div class="relative aspect-[16/10] overflow-hidden md:col-span-3 md:aspect-auto md:min-h-[420px]">
          ${capa(post, 'absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105', '(min-width: 768px) 60vw, 100vw')}
        </div>
        <div class="flex flex-col justify-center p-7 sm:p-9 md:col-span-2 lg:p-12">
          <div class="mb-5 flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-accent px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-wider text-brand-dark">Mais recente</span>
            <span class="rounded-full bg-brand-gray px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-wider text-brand-dark/70">${e(post.category)}</span>
          </div>
          <h2 class="font-display text-2xl font-semibold leading-tight tracking-tight text-brand-dark text-balance sm:text-3xl lg:text-4xl">
            <a href="${e(post.url)}" class="after:absolute after:inset-0">${e(post.title)}</a>
          </h2>
          <p class="mt-4 font-body text-base leading-relaxed text-gray-600 line-clamp-4">${e(post.description)}</p>
          <div class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">${meta(post)}</div>
          <span class="mt-8 inline-flex items-center gap-2 font-display text-sm font-semibold text-brand-navy transition-colors group-hover:text-accent-hover">
            Ler artigo <iconify-icon icon="solar:arrow-right-linear" class="transition-transform group-hover:translate-x-1"></iconify-icon>
          </span>
        </div>
      </article>`;
}

function faixaCta() {
  return `
    <section class="px-6 pb-20 md:px-12 md:pb-28 xl:px-20">
      <div class="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-brand-dark px-7 py-12 text-center text-white sm:px-12 md:py-16">
        <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-navy blur-3xl"></div>
        <div class="relative">
          <h2 class="font-display text-2xl font-medium tracking-tight text-balance md:text-4xl">Quanto você pode <span class="text-accent">economizar por mês?</span></h2>
          <p class="mx-auto mt-4 max-w-xl text-white/70">Mande uma foto da sua conta de luz no WhatsApp e receba uma simulação grátis, sem compromisso.</p>
          <a href="/contatos.html" class="mt-8 inline-flex items-center gap-3 rounded-full bg-accent px-8 py-4 font-display text-sm font-semibold text-brand-dark shadow-cta transition hover:brightness-110">
            <iconify-icon icon="mdi:whatsapp" class="text-xl"></iconify-icon> Solicitar simulação grátis
          </a>
        </div>
      </div>
    </section>`;
}

// ---------------------------------------------------------------- página inicial

// Seção "Fique por dentro" da página inicial com os 3 posts mais recentes.
function homeBlogSection(posts) {
  if (!posts.length) return '';
  const delays = ['', 'delay-100', 'delay-200'];
  return `
  <section id="blog" class="py-20 md:py-32 bg-brand-gray px-6 md:px-20 border-t border-gray-100 overflow-hidden">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 reveal">
        <span class="font-body text-xs font-semibold tracking-widest text-accent uppercase mb-4 block">Aprenda mais</span>
        <h2 class="font-display font-medium text-3xl md:text-5xl tracking-tighter text-brand-dark">Fique por dentro</h2>
        <p class="mt-4 font-body text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
          Acompanhe as últimas novidades, dicas de economia e conteúdos exclusivos sobre o mercado de energia solar.
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${posts
        .slice(0, 3)
        .map((p, i) => postCard(p, { reveal: true, delay: delays[i] }))
        .join('')}
      </div>
      <div class="mt-12 text-center reveal">
        <a href="/blog" class="inline-flex items-center gap-2 bg-white border border-gray-200 text-brand-dark font-display font-semibold px-8 py-3 rounded hover:bg-gray-50 transition-colors uppercase text-sm tracking-wide shadow-sm">
          Ver todos os artigos
        </a>
      </div>
    </div>
  </section>`;
}

// ---------------------------------------------------------------- listagem do blog

function blogIndex(posts, { page, totalPages, categorias, ativa }) {
  const query = (n) => {
    const params = new URLSearchParams();
    if (ativa) params.set('categoria', ativa.slug);
    if (n > 1) params.set('pagina', String(n));
    const q = params.toString();
    return q ? `/blog?${q}` : '/blog';
  };
  const path = query(page);

  const chip = (href, label, atual, total) =>
    `<a href="${e(href)}" ${atual ? 'aria-current="page"' : ''} class="shrink-0 rounded-full border px-4 py-2 font-body text-sm font-medium transition ${
      atual ? 'border-accent bg-accent text-brand-dark' : 'border-white/15 bg-white/5 text-white/80 hover:border-white/40 hover:text-white'
    }">${e(label)}${total != null ? ` <span class="${atual ? 'text-brand-dark/60' : 'text-white/40'}">${total}</span>` : ''}</a>`;

  const chips = [chip('/blog', 'Todos', !ativa), ...categorias.map((c) => chip(`/blog?categoria=${encodeURIComponent(c.slug)}`, c.nome, ativa && ativa.slug === c.slug, c.total))].join('\n          ');

  const mostrarDestaque = !ativa && page === 1 && posts.length > 0;
  const lista = mostrarDestaque ? posts.slice(1) : posts;
  const titulo = ativa ? `${ativa.nome}` : mostrarDestaque && lista.length ? 'Mais artigos' : '';

  const pager =
    totalPages > 1
      ? `<nav class="mt-14 flex items-center justify-center gap-3 font-display text-sm" aria-label="Paginação">
          ${page > 1 ? `<a href="${e(query(page - 1))}" class="rounded-full border border-gray-200 bg-white px-5 py-3 hover:bg-gray-50">← Mais recentes</a>` : ''}
          <span class="px-2 text-gray-500">Página ${page} de ${totalPages}</span>
          ${page < totalPages ? `<a href="${e(query(page + 1))}" class="rounded-full border border-gray-200 bg-white px-5 py-3 hover:bg-gray-50">Mais antigos →</a>` : ''}
        </nav>`
      : '';

  const conteudo = posts.length
    ? `${mostrarDestaque ? destaque(posts[0]) : ''}
      ${titulo ? `<h2 class="mt-16 mb-8 font-display text-2xl font-medium tracking-tight md:text-3xl ${mostrarDestaque ? '' : 'mt-0 rounded-2xl bg-white px-6 py-5 shadow-sm'}">${e(titulo)}</h2>` : ''}
      ${lista.length ? `<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">${lista.map((p) => postCard(p)).join('')}</div>` : ''}
      ${pager}`
    : `<div class="rounded-3xl bg-white px-6 py-20 text-center shadow-sm">
        <iconify-icon icon="solar:document-text-linear" class="text-5xl text-accent"></iconify-icon>
        <p class="mt-4 font-display text-xl">Nenhum artigo por aqui ainda.</p>
        <a href="/blog" class="mt-6 inline-block font-semibold text-brand-navy underline">Ver todos os artigos</a>
      </div>`;

  return layout({
    title: ativa ? `${ativa.nome} | Blog ${SITE_NAME}` : page > 1 ? `Blog — página ${page} | ${SITE_NAME}` : `Blog de Energia Solar | ${SITE_NAME}`,
    description: ativa
      ? `Artigos sobre ${ativa.nome.toLowerCase()} e energia solar na Bahia, explicados pela equipe da Girassol Energia Solar.`
      : 'Notícias, dicas de economia e tudo sobre energia solar na Bahia, explicado de forma simples pela equipe da Girassol Energia Solar.',
    path,
    schema: [{ '@context': 'https://schema.org', '@type': 'Blog', name: `Blog ${SITE_NAME}`, url: `${SITE_URL}/blog`, inLanguage: 'pt-BR' }],
    body: `
    <section class="relative overflow-hidden bg-brand-dark px-6 pb-28 pt-14 text-white md:px-12 md:pb-36 md:pt-20 xl:px-20">
      <div class="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-brand-navy blur-3xl"></div>
      <div class="relative mx-auto max-w-7xl text-center">
        <span class="mb-4 block font-body text-xs font-semibold uppercase tracking-widest text-accent">Blog Girassol</span>
        <h1 class="font-display text-4xl font-medium tracking-tighter text-balance md:text-6xl">Energia solar <span class="text-accent">sem complicação</span></h1>
        <p class="mx-auto mt-5 max-w-2xl font-body text-base text-white/70 md:text-lg">Notícias do setor, dicas de economia e respostas para as dúvidas mais comuns, explicadas por quem instala energia solar na Bahia todos os dias.</p>
        <nav class="-mx-6 mt-10 flex gap-2 overflow-x-auto px-6 pb-2 md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0" aria-label="Categorias">
          ${chips}
        </nav>
      </div>
    </section>
    <section class="relative px-6 pb-20 md:px-12 md:pb-28 xl:px-20">
      <div class="mx-auto -mt-16 max-w-7xl md:-mt-20">
      ${conteudo}
      </div>
    </section>
    ${faixaCta()}`,
  });
}

// ---------------------------------------------------------------- página do artigo

function botoesCompartilhar(post) {
  const url = `${SITE_URL}${post.url}`;
  const texto = encodeURIComponent(`${post.title} ${url}`);
  const u = encodeURIComponent(url);
  const base = 'flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-brand-dark transition hover:border-accent hover:text-accent-hover';
  return `<div class="flex flex-wrap items-center gap-2">
            <a href="https://wa.me/?text=${texto}" target="_blank" rel="noopener noreferrer" class="${base}" aria-label="Compartilhar no WhatsApp"><iconify-icon icon="mdi:whatsapp"></iconify-icon></a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener noreferrer" class="${base}" aria-label="Compartilhar no Facebook"><iconify-icon icon="mdi:facebook"></iconify-icon></a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener noreferrer" class="${base}" aria-label="Compartilhar no LinkedIn"><iconify-icon icon="mdi:linkedin"></iconify-icon></a>
            <button type="button" data-copiar-link="${e(url)}" class="${base}" aria-label="Copiar link do artigo"><iconify-icon icon="solar:link-linear"></iconify-icon></button>
          </div>`;
}

function sumario(post, { id }) {
  return `<ol class="space-y-1 text-sm" ${id ? `id="${id}"` : ''}>
              ${post.toc
                .map(
                  (t) => `<li class="${t.nivel === 3 ? 'pl-4' : ''}"><a href="#${t.id}" data-sumario-link class="sumario-link block rounded-lg border-l-2 border-transparent py-1.5 pl-3 pr-2 text-gray-600 transition hover:bg-brand-gray hover:text-brand-dark">${t.html}</a></li>`
                )
                .join('\n              ')}
            </ol>`;
}

function postPage(post, related) {
  const iso = post.date.toISOString();
  const temSumario = post.toc.filter((t) => t.nivel === 2).length >= 2;
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      image: [absolute(post.cover)],
      datePublished: iso,
      dateModified: (post.updated || post.date).toISOString(),
      inLanguage: 'pt-BR',
      author: { '@type': 'Organization', name: post.author, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/ARQUIVOS/LOGOS/cor-total.webp` } },
      mainEntityOfPage: `${SITE_URL}${post.url}`,
      keywords: post.tags.join(', '),
      articleSection: post.category,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}${post.url}` },
      ],
    },
  ];

  const credito = post.coverCredit
    ? `<figcaption class="mt-3 text-right text-xs text-gray-500">${post.coverCreditUrl ? `<a href="${e(post.coverCreditUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="underline hover:text-brand-dark">${e(post.coverCredit)}</a>` : e(post.coverCredit)}</figcaption>`
    : '';
  const capaHtml = post.cover
    ? `<figure class="px-6 md:px-12">
        <div class="mx-auto max-w-6xl">
          <img src="${e(post.cover)}"${srcset(post.cover, [640, 1200, 1800]) ? ` srcset="${srcset(post.cover, [640, 1200, 1800])}" sizes="(min-width: 1152px) 1152px, 100vw"` : ''} alt="${e(post.coverAlt)}" class="aspect-[16/9] w-full rounded-3xl object-cover shadow-xl shadow-brand-dark/10 md:aspect-[21/9]" fetchpriority="high" />
          ${credito}
        </div>
      </figure>`
    : '';

  const tags = post.tags.length
    ? `<div class="mt-12 flex flex-wrap gap-2">${post.tags.map((t) => `<span class="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">#${e(t)}</span>`).join('')}</div>`
    : '';
  const fontes = post.sources.length
    ? `<aside class="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 class="mb-3 flex items-center gap-2 font-display text-base font-semibold"><iconify-icon icon="solar:document-text-linear" class="text-accent"></iconify-icon> Fontes</h2>
          <ul class="space-y-2 text-sm">
            ${post.sources.map((s) => `<li><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer nofollow" class="text-brand-navy underline decoration-gray-300 underline-offset-4 hover:text-accent-hover">${e(s.title)}</a></li>`).join('')}
          </ul>
        </aside>`
    : '';
  const autor = `<div class="mt-10 flex items-start gap-4 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
          <img src="${ICONE}" alt="" class="h-14 w-14 shrink-0 rounded-full bg-brand-gray p-2" />
          <div>
            <p class="font-display font-semibold">${e(post.author)}</p>
            <p class="mt-1 text-sm leading-relaxed text-gray-600">Especialistas em energia solar em Irecê e em toda a Bahia desde 2020, com equipe técnica própria e engenheiro em cada projeto.</p>
          </div>
        </div>`;
  const mais = related.length
    ? `<section class="border-t border-gray-200 px-6 py-16 md:px-12 md:py-24 xl:px-20">
        <div class="mx-auto max-w-7xl">
          <div class="mb-10 flex items-end justify-between gap-4">
            <h2 class="font-display text-2xl font-medium tracking-tighter md:text-4xl">Continue lendo</h2>
            <a href="/blog" class="hidden shrink-0 font-display text-sm font-semibold text-brand-navy hover:text-accent-hover sm:inline">Ver todos →</a>
          </div>
          <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">${related.map((p) => postCard(p)).join('')}</div>
        </div>
      </section>`
    : '';

  return layout({
    title: `${post.title} | Blog ${SITE_NAME}`,
    description: post.description,
    path: post.url,
    image: post.cover,
    type: 'article',
    schema,
    scripts: ['/blog.js'],
    body: `
    <div id="progresso-leitura" class="fixed left-0 top-0 z-[95] h-1 w-full origin-left scale-x-0 bg-accent" aria-hidden="true"></div>
    <article>
      <header class="px-6 pb-10 pt-10 md:px-12 md:pb-12 md:pt-16">
        <div class="mx-auto max-w-4xl">
          <nav class="mb-8 flex items-center gap-2 text-sm text-gray-500" aria-label="Você está em">
            <a href="/blog" class="inline-flex items-center gap-1.5 font-medium hover:text-accent-hover"><iconify-icon icon="solar:arrow-left-linear"></iconify-icon> Blog</a>
            <span aria-hidden="true">/</span>
            <a href="${e(categoriaUrl(post))}" class="hover:text-accent-hover">${e(post.category)}</a>
          </nav>
          <h1 class="font-display text-3xl font-semibold leading-[1.1] tracking-tighter text-brand-dark text-balance sm:text-4xl md:text-5xl lg:text-6xl">${e(post.title)}</h1>
          <p class="mt-6 max-w-3xl text-lg leading-relaxed text-gray-600 md:text-xl">${e(post.description)}</p>
          <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span class="inline-flex items-center gap-3">
              <img src="${ICONE}" alt="" class="h-10 w-10 rounded-full bg-white p-1.5 ring-1 ring-gray-200" />
              <span class="font-semibold text-brand-dark">${e(post.author)}</span>
            </span>
            ${meta(post)}
          </div>
        </div>
      </header>

      ${capaHtml}

      <div class="px-6 py-12 md:px-12 md:py-16">
        <div class="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16">
          <div class="mx-auto min-w-0 max-w-3xl lg:mx-0">
            ${temSumario ? `<details class="group mb-10 rounded-2xl bg-white ring-1 ring-gray-200 lg:hidden">
              <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-display font-semibold">
                <span class="inline-flex items-center gap-2"><iconify-icon icon="solar:list-linear" class="text-accent"></iconify-icon> Neste artigo</span>
                <iconify-icon icon="solar:alt-arrow-down-linear" class="transition-transform group-open:rotate-180"></iconify-icon>
              </summary>
              <div class="border-t border-gray-100 px-3 py-3">${sumario(post, {})}</div>
            </details>` : ''}
            <div class="prose-girassol">${post.html}</div>
            ${tags}
            <div class="mt-12 flex flex-col gap-4 border-y border-gray-200 py-6 sm:flex-row sm:items-center sm:justify-between">
              <p class="font-display font-semibold">Gostou? Compartilhe com quem quer economizar:</p>
              ${botoesCompartilhar(post)}
            </div>
            ${fontes}
            ${autor}
          </div>

          <aside class="hidden lg:block" aria-label="Navegação do artigo">
            <div class="sticky top-28 space-y-6">
              ${temSumario ? `<nav class="rounded-2xl bg-white p-5 ring-1 ring-gray-200" aria-label="Neste artigo">
                <p class="mb-3 flex items-center gap-2 px-1 font-display text-sm font-semibold uppercase tracking-wider text-gray-500"><iconify-icon icon="solar:list-linear" class="text-accent"></iconify-icon> Neste artigo</p>
                ${sumario(post, { id: 'sumario' })}
              </nav>` : ''}
              <div class="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
                <p class="mb-3 px-1 font-display text-sm font-semibold uppercase tracking-wider text-gray-500">Compartilhar</p>
                ${botoesCompartilhar(post)}
              </div>
              <div class="relative overflow-hidden rounded-2xl bg-brand-dark p-6 text-white">
                <div class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/30 blur-2xl"></div>
                <p class="relative font-display text-lg font-semibold leading-snug">Simulação grátis da sua economia</p>
                <p class="relative mt-2 text-sm text-white/70">Resposta rápida pelo WhatsApp.</p>
                <a href="/contatos.html" class="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 font-display text-sm font-semibold text-brand-dark transition hover:brightness-110">
                  <iconify-icon icon="mdi:whatsapp" class="text-lg"></iconify-icon> Falar agora
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </article>
    ${faixaCta()}
    ${mais}`,
  });
}

// ---------------------------------------------------------------- outras

function notFoundPage() {
  return layout({
    title: `Página não encontrada | ${SITE_NAME}`,
    description: 'A página que você procurou não existe ou mudou de endereço.',
    path: '/404',
    noindex: true,
    body: `
    <section class="px-6 py-24 md:py-32 text-center">
      <p class="font-display text-7xl md:text-9xl font-semibold text-accent">404</p>
      <h1 class="mt-4 font-display text-2xl md:text-4xl font-medium tracking-tight">Página não encontrada</h1>
      <p class="mt-3 text-gray-600">O endereço pode ter mudado. Que tal começar pela página inicial?</p>
      <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <a href="/" class="rounded-full bg-accent px-8 py-4 font-display text-sm font-semibold hover:brightness-110">Ir para o início</a>
        <a href="/blog" class="rounded-full border border-gray-300 bg-white px-8 py-4 font-display text-sm font-semibold hover:bg-gray-50">Ver o blog</a>
      </div>
    </section>`,
  });
}

function rssFeed(posts) {
  const items = posts
    .slice(0, 20)
    .map(
      (p) => `
    <item>
      <title>${e(p.title)}</title>
      <link>${SITE_URL}${p.url}</link>
      <guid isPermaLink="true">${SITE_URL}${p.url}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <category>${e(p.category)}</category>
      <description>${e(p.description)}</description>
    </item>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog ${SITE_NAME}</title>
    <link>${SITE_URL}/blog</link>
    <description>Notícias e dicas sobre energia solar na Bahia.</description>
    <language>pt-BR</language>${items}
  </channel>
</rss>`;
}

function sitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: '/', lastmod: today, priority: '1.0' },
    { loc: '/contatos.html', lastmod: today, priority: '0.8' },
    { loc: '/blog', lastmod: posts[0] ? posts[0].date.toISOString().slice(0, 10) : today, priority: '0.8' },
    ...posts.map((p) => ({ loc: p.url, lastmod: (p.updated || p.date).toISOString().slice(0, 10), priority: '0.6' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((u) => `
  <url><loc>${SITE_URL}${e(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`)
    .join('')}
</urlset>`;
}

module.exports = { SITE_URL, homeBlogSection, blogIndex, postPage, notFoundPage, rssFeed, sitemap };
