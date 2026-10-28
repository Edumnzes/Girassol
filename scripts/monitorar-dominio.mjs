// Vigia do domínio e do site. Roda a cada 6 horas no GitHub Actions
// (.github/workflows/monitorar-dominio.yml). Se algo estiver errado, o
// workflow falha e o GitHub manda e-mail para quem mantém o repositório.
//
// Confere:
//   - domínio suspenso (client hold, server hold, redemption, pending delete);
//   - vencimento do registro do domínio chegando;
//   - servidores DNS trocados (ex.: voltaram para a Wix);
//   - site e blog respondendo, com o conteúdo certo;
//   - certificado SSL perto de vencer.
//
// No computador:  node scripts/monitorar-dominio.mjs
import tls from 'node:tls';
import fs from 'node:fs';

const DOMINIO = process.env.DOMINIO || 'girassolsolar.com';
const NS_ESPERADOS = (process.env.NS_ESPERADOS || 'apollo.dns-parking.com,athena.dns-parking.com')
  .toLowerCase()
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const DIAS_AVISO_DOMINIO = 60;
const DIAS_AVISO_SSL = 15;
const STATUS_GRAVES = ['client hold', 'server hold', 'redemption period', 'pending delete', 'inactive'];

const problemas = [];
const ok = [];
const dias = (data) => Math.floor((new Date(data) - Date.now()) / 86400000);

async function buscar(url, opcoes = {}) {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      return await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...opcoes });
    } catch (erro) {
      if (tentativa === 3) throw erro;
      await new Promise((r) => setTimeout(r, 5000 * tentativa));
    }
  }
}

// 1. Registro do domínio (RDAP oficial do .com)
async function conferirRegistro() {
  const res = await buscar(`https://rdap.verisign.com/com/v1/domain/${DOMINIO}`, { headers: { Accept: 'application/rdap+json' } });
  if (res.status === 404) return problemas.push(`O domínio ${DOMINIO} não aparece no registro (pode ter expirado).`);
  if (!res.ok) return problemas.push(`Não consegui consultar o registro do domínio (HTTP ${res.status}).`);
  const dados = await res.json();

  const status = (dados.status || []).map((s) => s.toLowerCase());
  const graves = status.filter((s) => STATUS_GRAVES.some((g) => s.includes(g)));
  if (graves.length) problemas.push(`Domínio SUSPENSO pelo registrador: ${graves.join(', ')}. Verifique a conta da Wix (e-mail de confirmação ou pagamento).`);
  else ok.push(`Status do domínio: ${status.join(', ') || 'normal'}`);

  const vencimento = (dados.events || []).find((e) => e.eventAction === 'expiration');
  if (vencimento) {
    const restam = dias(vencimento.eventDate);
    if (restam <= DIAS_AVISO_DOMINIO) problemas.push(`O domínio vence em ${restam} dias (${vencimento.eventDate.slice(0, 10)}). Renove na Wix.`);
    else ok.push(`Domínio vence em ${vencimento.eventDate.slice(0, 10)} (${restam} dias)`);
  }

  const ns = (dados.nameservers || []).map((n) => n.ldhName.toLowerCase());
  const iguais = NS_ESPERADOS.length === ns.length && NS_ESPERADOS.every((n) => ns.includes(n));
  if (!iguais) problemas.push(`Servidores DNS mudaram: agora ${ns.join(', ') || 'nenhum'} (esperado: ${NS_ESPERADOS.join(', ')}).`);
  else ok.push(`Servidores DNS corretos: ${ns.join(', ')}`);
}

// 2. Site e blog no ar, com o conteúdo certo
async function conferirSite() {
  const paginas = [
    { caminho: '/', texto: 'Girassol' },
    { caminho: '/blog', texto: 'Blog Girassol' },
  ];
  for (const { caminho, texto } of paginas) {
    const url = `https://${DOMINIO}${caminho}`;
    try {
      const res = await buscar(url);
      const corpo = res.status === 200 ? await res.text() : '';
      if (res.status !== 200) problemas.push(`${url} respondeu ${res.status}.`);
      else if (!corpo.includes(texto)) problemas.push(`${url} abriu, mas não parece o site da Girassol (pode estar apontando para outro lugar).`);
      else ok.push(`${url} no ar`);
    } catch (erro) {
      problemas.push(`${url} não respondeu (${erro.cause?.code || erro.message}).`);
    }
  }
}

// 3. Certificado SSL
function conferirSsl() {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: DOMINIO, port: 443, servername: DOMINIO, timeout: 20000 }, () => {
      const cert = socket.getPeerCertificate();
      if (!socket.authorized) problemas.push(`Certificado SSL inválido: ${socket.authorizationError}.`);
      else {
        const restam = dias(cert.valid_to);
        if (restam <= DIAS_AVISO_SSL) problemas.push(`Certificado SSL vence em ${restam} dias e não foi renovado.`);
        else ok.push(`SSL válido até ${new Date(cert.valid_to).toISOString().slice(0, 10)} (${restam} dias)`);
      }
      socket.end();
      resolve();
    });
    socket.on('error', (erro) => {
      problemas.push(`Não consegui abrir conexão segura com ${DOMINIO} (${erro.code || erro.message}).`);
      resolve();
    });
    socket.on('timeout', () => socket.destroy(new Error('tempo esgotado')));
  });
}

await conferirRegistro().catch((e) => problemas.push(`Erro ao consultar o registro: ${e.message}`));
await conferirSite();
await conferirSsl();

const relatorio = [
  `## Vigia do domínio ${DOMINIO}`,
  problemas.length ? '### ❌ Problemas' : '### ✅ Tudo certo',
  ...problemas.map((p) => `- ${p}`),
  ...(problemas.length ? ['', '### Itens ok'] : []),
  ...ok.map((o) => `- ${o}`),
].join('\n');

console.log(relatorio);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, relatorio + '\n');
process.exit(problemas.length ? 1 : 0);
