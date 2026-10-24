# Girassol Energia Solar — site institucional e blog

Site da **Girassol Energia Solar** (Irecê, Bahia): página de vendas, central de atendimento por WhatsApp, blog com painel de edição e um robô que publica notícias de energia solar automaticamente.

**Endereço:** <https://girassolsolar.com>

[![Verificação do site](https://github.com/Edumnzes/Girassol/actions/workflows/verificacao.yml/badge.svg)](https://github.com/Edumnzes/Girassol/actions/workflows/verificacao.yml)

---

## Sumário

- [O que o site tem](#o-que-o-site-tem)
- [Como funciona](#como-funciona)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Rodar no computador](#rodar-no-computador)
- [Publicação (deploy)](#publicação-deploy)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Guias](#guias)
- [Segurança](#segurança)

## O que o site tem

| Recurso | Onde | Detalhes |
|---|---|---|
| Página inicial | `/` | Oferta, depoimentos em vídeo, números, processo de 45 dias, FAQ |
| Central de atendimento | `/contatos.html` | WhatsApp de cada filial |
| Blog | `/blog` | Destaque, filtro por categoria, sumário automático, compartilhamento, SEO (Open Graph, dados estruturados, sitemap e RSS) |
| Painel do blog | Endereço secreto | Editor visual com login em duas etapas (senha + código 2FA + GitHub) ([guia](docs/painel-do-blog.md)) |
| Robô de notícias | GitHub Actions | Pesquisa notícias e publica 2 artigos por semana ([guia](docs/robo-de-noticias.md)) |
| Avaliações do Google | `/api/avaliacoes` | Nota e comentários atualizados sozinhos ([guia](docs/avaliacoes-google.md)) |

## Como funciona

```
Visitante ──► Cloudflare (opcional) ──► Hostinger (Node.js: server.js)
                                              │
                    ┌─────────────────────────┼──────────────────────────┐
                    ▼                         ▼                          ▼
           páginas estáticas          blog/posts/*.md            /api/avaliacoes
       (giraindex.html, ARQUIVOS/)   viram páginas HTML        (Google Places, cache 12h)

Painel (endereço secreto) ──► GitHub (commit) ──┐
Robô (GitHub Actions) ──► commit ───────────────┼──► Hostinger publica sozinha a cada commit na main
Você (git push) ────────────────────────────────┘
```

- O site roda em **Node.js puro** (`server.js`), sem framework. Só duas bibliotecas: `marked` (Markdown) e `yaml`.
- **O conteúdo do blog mora no próprio repositório**, em `blog/posts/`. Não há banco de dados: o histórico do git guarda todas as versões de cada artigo.
- A **Hostinger** está ligada ao GitHub com implantação automática: todo commit na `main` atualiza o site em cerca de 1 minuto.

## Estrutura de pastas

```
├── server.js              Servidor: rotas, segurança, compressão, vídeos
├── lib/
│   ├── blog.js            Lê os posts Markdown e gera HTML seguro
│   ├── templates.js       HTML das páginas do blog, sitemap e RSS
│   ├── avaliacoes.js      Avaliações do Google (Places API)
│   ├── painel.js          Acesso ao painel: senha, 2FA, sessões, bloqueio
│   └── github-oauth.js    Login do GitHub dentro do painel
├── giraindex.html         Página inicial
├── contatos.html          Central de atendimento
├── main.js                Animações, carrosséis, vídeos e avaliações (navegador)
├── blog.js                Barra de leitura, sumário e copiar link (página de artigo)
├── input.css              Estilos (Tailwind) → compilado em styles.min.css
├── blog/posts/            Artigos do blog (um arquivo .md por artigo)
├── painel/                Painel do blog (Decap CMS), servido só com login
├── ARQUIVOS/              Imagens, logos, vídeos e fotos enviadas pelo painel (BLOG/)
├── robo/                  Robô de notícias (roda só no GitHub Actions)
├── scripts/               Utilitários: criar usuário do painel, converter imagens
├── docs/                  Guias detalhados
└── .github/               Workflows (verificação, robô) e Dependabot
```

## Rodar no computador

Requisitos: **Node.js 20 ou mais novo**.

```bash
npm install
```

```bash
npm start
```

Abra <http://localhost:3000>.

Para usar variáveis de ambiente locais, copie `.env.exemplo` para `.env` e rode `npm run dev` no lugar de `npm start`.

**Alterou classes do Tailwind no HTML ou no `lib/templates.js`?** Recompile o CSS:

```bash
npm run css
```

**Testar o painel do blog:** veja [Testar no computador](docs/painel-do-blog.md#testar-no-computador).

## Publicação (deploy)

1. Faça commit e push na branch `main`.
2. O workflow **Verificação do site** testa as páginas e a segurança.
3. A Hostinger implanta a nova versão automaticamente (hPanel → Sites → girassolsolar.com → Implantações).

Detalhes da hospedagem, domínio e Cloudflare: [docs/hospedagem-e-dominio.md](docs/hospedagem-e-dominio.md) e [docs/cloudflare.md](docs/cloudflare.md).

## Variáveis de ambiente

Configuradas no hPanel (app Node.js → Variáveis de ambiente). **Nunca coloque chaves no código.**

| Variável | Obrigatória | Para quê |
|---|---|---|
| `PORT` | Não (a Hostinger define) | Porta do servidor |
| `SITE_URL` | Não (padrão `https://girassolsolar.com`) | Endereço oficial usado no SEO e no login do painel |
| `PAINEL_CAMINHO` | Para o painel | Endereço secreto do painel. Sem ela, o painel não existe ([guia](docs/painel-do-blog.md#configuração-inicial-uma-vez-só)) |
| `PAINEL_USUARIOS` | Para o painel | Usuários com senha e 2FA, gerados por `npm run criar-usuario` |
| `GITHUB_OAUTH_CLIENT_ID` | Para o painel | Login do GitHub no painel |
| `GITHUB_OAUTH_CLIENT_SECRET` | Para o painel | Login do GitHub no painel |
| `GOOGLE_PLACES_API_KEY` | Para avaliações automáticas | Chave da API do Google ([guia](docs/avaliacoes-google.md)) |
| `GOOGLE_PLACE_ID` | Para avaliações automáticas | Identificador da empresa no Google Maps |

O robô de notícias usa **segredos do GitHub** (não da Hostinger): `ANTHROPIC_API_KEY` e, opcionalmente, `UNSPLASH_ACCESS_KEY`. Veja o [guia do robô](docs/robo-de-noticias.md).

## Guias

- [Painel do blog: como publicar artigos](docs/painel-do-blog.md)
- [Robô de notícias](docs/robo-de-noticias.md)
- [Avaliações automáticas do Google](docs/avaliacoes-google.md)
- [Hospedagem e domínio](docs/hospedagem-e-dominio.md)
- [Cloudflare](docs/cloudflare.md)

## Segurança

Resumo das proteções e como relatar problemas: [SECURITY.md](SECURITY.md).

---

© Girassol Energia Solar — CNPJ 41.564.038/0001-74. Todos os direitos reservados. Código e conteúdo de uso exclusivo da empresa.
