// Converte uma página HTML em PDF (A4), usando o Chrome/Edge instalado.
//
//   node scripts/html-para-pdf.mjs entrada.html saida.pdf
//
// Precisa do playwright-core:  npm install --no-save playwright-core
// No GitHub Actions usa o Google Chrome que já vem no ubuntu-latest.
// No Windows, use NAVEGADOR=msedge (padrão: chrome).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error('Uso: node scripts/html-para-pdf.mjs entrada.html saida.pdf');
  process.exit(1);
}

let html = fs.readFileSync(entrada, 'utf8');

// Páginas sem <html> (ex.: publicadas como Artifact) ganham a estrutura mínima
if (!/<html[\s>]/i.test(html)) {
  html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`;
}

// Diagramas Mermaid são desenhados antes de imprimir
const temMermaid = /class="mermaid"/.test(html);
if (temMermaid) {
  html = html.replace(
    '</body>',
    `<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'DM Sans, sans-serif' });
mermaid.run().then(() => { document.body.dataset.pronto = '1'; });</script></body>`
  );
}

const browser = await chromium.launch({ channel: process.env.NAVEGADOR || 'chrome' });
const page = await browser.newPage();
await page.emulateMedia({ media: 'print', colorScheme: 'light' });
await page.setContent(html, { waitUntil: 'networkidle' });
if (temMermaid) await page.waitForSelector('body[data-pronto="1"]', { timeout: 20000 });
await page.evaluate(() => document.fonts.ready);

fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
await page.pdf({
  path: saida,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: true,
});
await browser.close();
console.log(`[pdf] ${saida} (${Math.round(fs.statSync(saida).size / 1024)} KB) a partir de ${pathToFileURL(path.resolve(entrada)).href}`);
