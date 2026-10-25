// Otimiza as imagens do blog (ARQUIVOS/BLOG): no máximo 1600 px, formato WebP,
// sem dados do celular (GPS, modelo). Também corrige os links nos posts quando
// o nome do arquivo muda (ex.: foto.jpg -> foto.webp).
//
// Roda sozinho no GitHub Actions (.github/workflows/otimizar-imagens.yml) como
// rede de segurança: o painel já otimiza antes de enviar (painel/index.html).
//
// No computador:  npm install --no-save sharp  &&  node scripts/otimizar-imagens.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(ROOT, 'ARQUIVOS', 'BLOG');
const POSTS = path.join(ROOT, 'blog', 'posts');
const LADO_MAXIMO = 1600;
const LIMITE_WEBP = 400 * 1024; // WebP já pequeno e no tamanho certo fica como está
const FORMATOS = /\.(jpe?g|png|webp|bmp|tiff?|avif)$/i;

function listar(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = path.join(pasta, item.name);
    return item.isDirectory() ? listar(caminho) : FORMATOS.test(item.name) ? [caminho] : [];
  });
}

function nomeLivre(desejado, original) {
  if (desejado === original || !fs.existsSync(desejado)) return desejado;
  const base = desejado.replace(/\.webp$/, '');
  for (let i = 2; ; i++) if (!fs.existsSync(`${base}-${i}.webp`)) return `${base}-${i}.webp`;
}

function publico(caminho) {
  return '/' + path.relative(ROOT, caminho).split(path.sep).join('/');
}

const trocas = [];
for (const arquivo of listar(PASTA)) {
  const antes = fs.statSync(arquivo).size;
  const meta = await sharp(arquivo).metadata();
  const jaOtimizada = /\.webp$/i.test(arquivo) && antes <= LIMITE_WEBP && Math.max(meta.width, meta.height) <= LADO_MAXIMO;
  if (jaOtimizada) continue;

  const buffer = await sharp(arquivo)
    .rotate() // respeita a orientação da foto do celular
    .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer(); // sem withMetadata(): os dados EXIF/GPS são descartados

  const destino = nomeLivre(arquivo.replace(FORMATOS, '.webp'), arquivo);
  if (/\.webp$/i.test(arquivo) && buffer.length >= antes && Math.max(meta.width, meta.height) <= LADO_MAXIMO) continue;
  fs.writeFileSync(destino, buffer);
  if (destino !== arquivo) fs.unlinkSync(arquivo);
  trocas.push({ de: publico(arquivo), para: publico(destino), antes, depois: buffer.length });
  console.log(`[imagens] ${publico(arquivo)} (${Math.round(antes / 1024)} KB) -> ${publico(destino)} (${Math.round(buffer.length / 1024)} KB)`);
}

// Atualiza os links nos posts quando o nome mudou
const renomeadas = trocas.filter((t) => t.de !== t.para);
if (renomeadas.length && fs.existsSync(POSTS)) {
  for (const post of fs.readdirSync(POSTS).filter((f) => f.endsWith('.md'))) {
    const caminho = path.join(POSTS, post);
    let texto = fs.readFileSync(caminho, 'utf8');
    const original = texto;
    for (const t of renomeadas) texto = texto.split(t.de).join(t.para);
    if (texto !== original) {
      fs.writeFileSync(caminho, texto);
      console.log(`[imagens] Links atualizados em blog/posts/${post}`);
    }
  }
}

console.log(trocas.length ? `[imagens] ${trocas.length} imagem(ns) otimizada(s).` : '[imagens] Nada a otimizar.');
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `alterou=${trocas.length ? 'sim' : 'nao'}\n`);
