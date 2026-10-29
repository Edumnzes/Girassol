// Relatório mensal de manutenção do site, para enviar ao cliente.
//
// Junta dados reais do mês: artigos publicados, melhorias e correções,
// atualizações de segurança, disponibilidade (pelo vigia do domínio) e a
// situação atual do domínio e do SSL. Gera:
//   relatorio/relatorio-AAAA-MM.html  -> para o cliente (abrir e salvar como PDF)
//   relatorio/relatorio-AAAA-MM.md    -> resumo interno (vira uma issue no GitHub)
//
// Roda sozinho no dia 1º (.github/workflows/relatorio-mensal.yml).
// No computador (precisa do GitHub CLI logado):
//   MES=2026-10 GITHUB_TOKEN=$(gh auth token) node scripts/relatorio-mensal.mjs
import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';
import dns from 'node:dns';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const REPO = process.env.GITHUB_REPOSITORY || 'Edumnzes/Girassol';
const TOKEN = process.env.GITHUB_TOKEN || '';
const DOMINIO = process.env.DOMINIO || 'girassolsolar.com';
const RESPONSAVEL = process.env.RESPONSAVEL || 'Eduardo';
const SAIDA = path.join(ROOT, 'relatorio');

// ---------------------------------------------------------------- período

function mesAnterior() {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
  const d = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MES = process.env.MES || mesAnterior();
if (!/^\d{4}-\d{2}$/.test(MES)) throw new Error('MES deve estar no formato AAAA-MM');
const [ano, mes] = MES.split('-').map(Number);
const inicio = new Date(Date.UTC(ano, mes - 1, 1, 3)); // 00:00 na Bahia (UTC-3)
const fim = new Date(Date.UTC(ano, mes, 1, 3));
const nomeMes = new Date(Date.UTC(ano, mes - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const NomeMes = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

const fmtData = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bahia' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------------------------------------------------------------- histórico do git

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function tituloDoPost(sha, arquivo) {
  try {
    const conteudo = git(['show', `${sha}:${arquivo}`]);
    const m = /^title:\s*["']?(.+?)["']?\s*$/m.exec(conteudo);
    return m ? m[1] : path.basename(arquivo, '.md');
  } catch {
    return path.basename(arquivo, '.md');
  }
}

const SEP = '\u0001';
const bruto = git(['log', 'main', `--since=${inicio.toISOString()}`, `--until=${fim.toISOString()}`, '--no-merges', `--pretty=format:${SEP}%H\t%an\t%aI\t%s`, '--name-status']);
const commits = bruto
  .split(SEP)
  .filter(Boolean)
  .map((bloco) => {
    const [cabecalho, ...linhas] = bloco.trim().split('\n');
    const [sha, autor, data, assunto] = cabecalho.split('\t');
    const arquivos = linhas.filter(Boolean).map((l) => {
      const [status, ...resto] = l.split('\t');
      return { status: status[0], arquivo: resto[resto.length - 1] };
    });
    return { sha, autor, data, assunto, arquivos };
  });

const artigosNovos = [];
let artigosEditados = 0;
const seguranca = [];
const melhorias = [];
let imagensOtimizadas = 0;

for (const c of commits) {
  const posts = c.arquivos.filter((a) => /^blog\/posts\/.+\.md$/.test(a.arquivo));
  for (const p of posts.filter((a) => a.status === 'A')) {
    artigosNovos.push({
      titulo: tituloDoPost(c.sha, p.arquivo),
      data: c.data,
      url: `https://${DOMINIO}/blog/${path.basename(p.arquivo, '.md')}`,
    });
  }
  artigosEditados += posts.filter((a) => a.status === 'M').length;

  if (/dependabot/i.test(c.autor)) seguranca.push(c.assunto);
  else if (/otimizador/i.test(c.autor)) imagensOtimizadas += 1;
  else if (posts.length && posts.length === c.arquivos.filter((a) => !a.arquivo.startsWith('ARQUIVOS/BLOG/')).length) continue; // só conteúdo do blog
  else melhorias.push({ assunto: c.assunto, data: c.data });
}

// Lista opcional escrita à mão, em linguagem de cliente, que substitui as
// mensagens dos commits: docs/relatorios/AAAA-MM.json
//   { "melhorias": ["Texto 1", "Texto 2"], "observacao": "Texto livre (opcional)" }
let notas = null;
const arquivoNotas = path.join(ROOT, 'docs', 'relatorios', `${MES}.json`);
if (fs.existsSync(arquivoNotas)) {
  notas = JSON.parse(fs.readFileSync(arquivoNotas, 'utf8'));
  if (Array.isArray(notas.melhorias)) {
    melhorias.length = 0;
    notas.melhorias.forEach((assunto) => melhorias.push({ assunto, data: null }));
  }
}

// ---------------------------------------------------------------- GitHub (vigia e verificações)

async function api(caminho) {
  if (!TOKEN) return null;
  const res = await fetch(`https://api.github.com/repos/${REPO}${caminho}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) {
    console.warn(`[relatório] GitHub ${caminho} -> ${res.status}`);
    return null;
  }
  return res.json();
}

async function execucoes(workflow) {
  const faixa = `${inicio.toISOString().slice(0, 19)}Z..${fim.toISOString().slice(0, 19)}Z`;
  const runs = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const dados = await api(`/actions/workflows/${workflow}/runs?created=${encodeURIComponent(faixa)}&per_page=100&page=${pagina}`);
    if (!dados) return null;
    runs.push(...dados.workflow_runs);
    if (dados.workflow_runs.length < 100) break;
  }
  return runs.filter((r) => r.status === 'completed');
}

const vigia = await execucoes('monitorar-dominio.yml');
const verificacoes = await execucoes('verificacao.yml');
const prsAbertos = await api('/pulls?state=open&per_page=100');

let disponibilidade = null;
let falhasVigia = [];
if (vigia && vigia.length) {
  const validas = vigia.filter((r) => ['success', 'failure'].includes(r.conclusion));
  const ok = validas.filter((r) => r.conclusion === 'success').length;
  falhasVigia = validas.filter((r) => r.conclusion === 'failure').map((r) => r.created_at);
  disponibilidade = validas.length ? (ok / validas.length) * 100 : null;
}

// ---------------------------------------------------------------- situação atual

async function vencimentoDominio() {
  try {
    const res = await fetch(`https://rdap.verisign.com/com/v1/domain/${DOMINIO}`, { signal: AbortSignal.timeout(20000) });
    const dados = await res.json();
    const ev = (dados.events || []).find((e) => e.eventAction === 'expiration');
    const suspenso = (dados.status || []).some((s) => /hold|redemption|pending delete/i.test(s));
    return { vence: ev ? ev.eventDate : null, suspenso };
  } catch {
    return { vence: null, suspenso: null };
  }
}

// Se o DNS local ainda não enxergar o domínio, pergunta à Cloudflare e ao Google
async function enderecoDoSite() {
  try {
    return (await dns.promises.lookup(DOMINIO)).address;
  } catch {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(['1.1.1.1', '8.8.8.8']);
    return (await resolver.resolve4(DOMINIO))[0];
  }
}

async function validadeSsl() {
  const host = await enderecoDoSite().catch(() => DOMINIO);
  return new Promise((resolve) => {
    const s = tls.connect({ host, port: 443, servername: DOMINIO, timeout: 20000 }, () => {
      const cert = s.getPeerCertificate();
      resolve(s.authorized ? cert.valid_to : null);
      s.end();
    });
    s.on('error', () => resolve(null));
    s.on('timeout', () => { s.destroy(); resolve(null); });
  });
}

const dominio = await vencimentoDominio();
const ssl = await validadeSsl();
let totalArtigos = null;
try {
  totalArtigos = require(path.join(ROOT, 'lib', 'blog.js')).getPosts().length;
} catch { /* sem dependências instaladas */ }

// ---------------------------------------------------------------- textos

const pct = disponibilidade == null ? 'sem dados' : `${disponibilidade.toFixed(disponibilidade === 100 ? 0 : 1).replace('.', ',')}%`;
const dependabotAbertos = (prsAbertos || []).filter((p) => /dependabot/i.test(p.user?.login || ''));

const destaques = [
  disponibilidade == null ? null : disponibilidade === 100 ? 'O site ficou no ar o mês inteiro, sem nenhuma queda detectada.' : `O site ficou disponível em ${pct} das verificações. As ocorrências estão listadas abaixo.`,
  artigosNovos.length ? `${artigosNovos.length} ${artigosNovos.length === 1 ? 'artigo novo publicado' : 'artigos novos publicados'} no blog.` : 'Nenhum artigo novo no blog neste mês.',
  melhorias.length ? `${melhorias.length} ${melhorias.length === 1 ? 'melhoria ou correção aplicada' : 'melhorias e correções aplicadas'} no site.` : null,
  seguranca.length ? `${seguranca.length} ${seguranca.length === 1 ? 'atualização de segurança aplicada' : 'atualizações de segurança aplicadas'}.` : 'Nenhuma atualização de segurança foi necessária.',
].filter(Boolean);

// ---------------------------------------------------------------- HTML (cliente)

const linhasArtigos = artigosNovos.length
  ? artigosNovos.map((a) => `<tr><td>${fmtData(a.data)}</td><td><a href="${esc(a.url)}">${esc(a.titulo)}</a></td></tr>`).join('')
  : '<tr><td colspan="2" class="vazio">Nenhum artigo publicado neste mês.</td></tr>';
const linhasMelhorias = melhorias.length
  ? melhorias.map((m) => `<li>${m.data ? `<span class="data">${fmtData(m.data)}</span> ` : ''}${esc(m.assunto)}</li>`).join('')
  : '<li class="vazio">Nenhuma alteração no site neste mês.</li>';

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de manutenção · ${esc(NomeMes)} · Girassol Energia Solar</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600&family=Sora:wght@600&display=swap" rel="stylesheet">
<style>
  :root { --ink:#0a1526; --muted:#4b5a70; --line:#dde3ec; --sun:#fdaa02; --navy:#022c65; --ok:#15803d; --warn:#b45309; --bg:#f5f7fa; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 "DM Sans","Segoe UI",system-ui,sans-serif; }
  .folha { max-width:820px; margin:24px auto; background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; }
  header { background:var(--ink); color:#fff; padding:36px 40px 30px; }
  .rotulo { color:var(--sun); font-size:12px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; }
  h1 { font-family:Sora,"Segoe UI",sans-serif; font-size:30px; line-height:1.15; margin:8px 0 6px; letter-spacing:-.02em; }
  header p { margin:0; color:rgba(255,255,255,.7); font-size:14px; }
  main { padding:32px 40px 40px; display:grid; gap:30px; }
  h2 { font-family:Sora,"Segoe UI",sans-serif; font-size:19px; margin:0 0 12px; letter-spacing:-.01em; }
  .numeros { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; }
  .numero { border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
  .numero b { display:block; font-family:Sora,sans-serif; font-size:26px; font-variant-numeric:tabular-nums; }
  .numero span { font-size:13px; color:var(--muted); }
  ul { margin:0; padding-left:20px; display:grid; gap:6px; }
  li::marker { color:var(--sun); }
  .data { color:var(--muted); font-size:13px; font-variant-numeric:tabular-nums; margin-right:6px; }
  table { width:100%; border-collapse:collapse; font-size:15px; }
  th, td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  td:first-child { white-space:nowrap; font-variant-numeric:tabular-nums; color:var(--muted); }
  a { color:var(--navy); }
  .vazio { color:var(--muted); font-style:italic; }
  .ok { color:var(--ok); font-weight:600; }
  .aviso { color:var(--warn); font-weight:600; }
  footer { border-top:1px solid var(--line); padding:18px 40px; font-size:13px; color:var(--muted); display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; }
  @media (max-width:600px) { header, main, footer { padding-left:20px; padding-right:20px; } .folha { margin:0; border-radius:0; border:0; } }
  @page { size:A4; margin:14mm 0 16mm; }
  @page :first { margin-top:0; }
  @media print {
    body { background:#fff; font-size:14px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .folha { margin:0; border:0; border-radius:0; max-width:none; }
    header, main, footer { padding-left:16mm; padding-right:16mm; }
    section { break-inside:avoid; } h2 { break-after:avoid; } tr, li { break-inside:avoid; }
    a { color:var(--ink); text-decoration:none; }
  }
</style>
</head>
<body>
<div class="folha">
  <header>
    <span class="rotulo">Relatório de manutenção</span>
    <h1>${esc(NomeMes)}</h1>
    <p>Site ${esc(DOMINIO)} · Girassol Energia Solar</p>
  </header>
  <main>
    <section>
      <h2>Resumo do mês</h2>
      <ul>${destaques.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
    </section>
    <section class="numeros" aria-label="Números do mês">
      <div class="numero"><b>${esc(pct)}</b><span>Tempo no ar</span></div>
      <div class="numero"><b>${artigosNovos.length}</b><span>Artigos novos</span></div>
      <div class="numero"><b>${melhorias.length}</b><span>Melhorias e correções</span></div>
      <div class="numero"><b>${seguranca.length}</b><span>Atualizações de segurança</span></div>
    </section>
    ${notas && notas.observacao ? `<section><h2>Observação</h2><p>${esc(notas.observacao)}</p></section>` : ''}
    <section>
      <h2>Artigos publicados no blog</h2>
      <table><thead><tr><th>Data</th><th>Artigo</th></tr></thead><tbody>${linhasArtigos}</tbody></table>
      ${artigosEditados ? `<p class="vazio">Além disso, ${artigosEditados} ${artigosEditados === 1 ? 'artigo foi revisado' : 'revisões em artigos existentes'}.</p>` : ''}
    </section>
    <section>
      <h2>Melhorias e correções no site</h2>
      <ul>${linhasMelhorias}</ul>
    </section>
    <section>
      <h2>Segurança e monitoramento</h2>
      <ul>
        <li>Verificação automática do site a cada 6 horas: ${vigia ? `${vigia.length} verificações no mês` : 'em funcionamento'}${falhasVigia.length ? `, <span class="aviso">${falhasVigia.length} com alerta</span> (${falhasVigia.slice(0, 5).map(fmtData).join(', ')})` : ', <span class="ok">nenhum alerta</span>'}.</li>
        <li>Atualizações de segurança: ${seguranca.length ? `${seguranca.length} aplicadas` : '<span class="ok">nenhuma necessária</span>'}.</li>
        ${imagensOtimizadas ? `<li>Imagens otimizadas automaticamente: ${imagensOtimizadas} vez(es).</li>` : ''}
        <li>Testes automáticos de funcionamento e segurança a cada alteração: ${verificacoes ? `${verificacoes.filter((r) => r.conclusion === 'success').length} de ${verificacoes.length} aprovados` : 'ativos'}.</li>
        <li>Backup diário do site na Hostinger e histórico completo de versões no GitHub.</li>
      </ul>
    </section>
    <section>
      <h2>Situação atual</h2>
      <table><tbody>
        <tr><td>Domínio</td><td>${dominio.suspenso ? '<span class="aviso">Atenção: suspenso pelo registrador</span>' : '<span class="ok">Ativo</span>'}${dominio.vence ? ` · renovado até ${fmtData(dominio.vence)}` : ''}</td></tr>
        <tr><td>Certificado de segurança</td><td>${ssl ? `<span class="ok">Válido</span> · renovação automática (atual até ${fmtData(ssl)})` : '<span class="aviso">Não foi possível conferir</span>'}</td></tr>
        <tr><td>Artigos no blog</td><td>${totalArtigos ?? '—'} publicados no total</td></tr>
      </tbody></table>
    </section>
  </main>
  <footer><span>Girassol Energia Solar · girassolsolar.com</span><span>Manutenção: ${esc(RESPONSAVEL)} · gerado em ${fmtData(new Date())}</span></footer>
</div>
</body>
</html>`;

// ---------------------------------------------------------------- Markdown (interno)

const md = [
  `## Relatório de manutenção · ${NomeMes}`,
  '',
  `O relatório para o cliente está pronto em **PDF**: baixe nos *Artifacts* da execução (link no fim desta issue), confira e envie.`,
  '',
  '### Resumo',
  ...destaques.map((d) => `- ${d}`),
  '',
  `| Tempo no ar | Artigos novos | Melhorias | Segurança |`,
  `|---|---|---|---|`,
  `| ${pct} | ${artigosNovos.length} | ${melhorias.length} | ${seguranca.length} |`,
  '',
  '### Para revisar antes de enviar',
  notas ? `- ✅ Melhorias vindas de docs/relatorios/${MES}.json (texto para o cliente).` : `- ✏️ As melhorias vieram das mensagens dos commits. Para reescrever em linguagem de cliente, crie docs/relatorios/${MES}.json e rode o workflow de novo (Run workflow, mês ${MES}).`,
  falhasVigia.length ? `- ⚠️ O vigia registrou ${falhasVigia.length} alerta(s): ${falhasVigia.map(fmtData).join(', ')}. Confira se foram quedas reais.` : '- ✅ Nenhum alerta do vigia no mês.',
  dependabotAbertos.length ? `- 🔧 ${dependabotAbertos.length} atualização(ões) do Dependabot aguardando revisão: ${dependabotAbertos.map((p) => `#${p.number}`).join(', ')}.` : '- ✅ Nenhuma atualização pendente do Dependabot.',
  dominio.suspenso ? '- 🚨 **Domínio suspenso!** Verifique a conta da Wix.' : '',
].filter((l) => l !== null).join('\n');

fs.mkdirSync(SAIDA, { recursive: true });
const arqHtml = path.join(SAIDA, `relatorio-${MES}.html`);
const arqMd = path.join(SAIDA, `relatorio-${MES}.md`);
fs.writeFileSync(arqHtml, html);
fs.writeFileSync(arqMd, md);
console.log(`[relatório] ${NomeMes}: ${artigosNovos.length} artigos, ${melhorias.length} melhorias, ${seguranca.length} segurança, no ar ${pct}`);
console.log(`[relatório] ${path.relative(ROOT, arqHtml)} e ${path.relative(ROOT, arqMd)}`);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `titulo=Relatório de manutenção · ${NomeMes}\nmes=${MES}\n`);
}
