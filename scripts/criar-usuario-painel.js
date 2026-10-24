#!/usr/bin/env node
// Cria um usuário para o painel do blog.
//
//   node scripts/criar-usuario-painel.js
//
// Pede o nome e a senha (a senha não aparece na tela), gera a chave do
// app autenticador (2FA) e mostra a linha para colocar na variável
// PAINEL_USUARIOS da Hostinger. Nada é salvo em arquivo nem enviado à internet.
const crypto = require('crypto');
const readline = require('readline');

process.env.PAINEL_CAMINHO = ''; // não precisa do painel ligado para gerar usuário
const { hashSenha, base32Encode, codigoTotp } = require('../lib/painel');

// Um único leitor com fila: funciona digitando ou colando várias linhas.
// Quando "oculto", o que é digitado aparece como asteriscos.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
const linhas = rl[Symbol.asyncIterator]();
let oculto = false;
rl._writeToOutput = (s) => {
  if (!oculto) return rl.output.write(s);
  if (/[\r\n]/.test(s)) return rl.output.write('\n');
  rl.output.write('*'.repeat(s.length));
};

async function perguntar(texto, opcoes = {}) {
  process.stdout.write(texto);
  oculto = Boolean(opcoes.oculto);
  const { value, done } = await linhas.next();
  oculto = false;
  if (done) {
    console.error('\nEntrada encerrada.');
    process.exit(1);
  }
  return value;
}

function senhaForte(senha) {
  if (senha.length < 12) return 'use pelo menos 12 caracteres';
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (tipos < 3) return 'misture letras minúsculas, maiúsculas, números e símbolos (pelo menos 3 tipos)';
  return null;
}

function sair(mensagem) {
  console.error(mensagem);
  process.exit(1);
}

(async () => {
  console.log('\n=== Novo usuário do painel do blog Girassol ===\n');

  const nome = (await perguntar('Nome de usuário (ex.: eduardo): ')).trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(nome)) sair('Nome inválido: use 3 a 32 letras minúsculas, números, ponto, hífen ou sublinhado.');

  const senha = await perguntar('Senha (mínimo 12 caracteres): ', { oculto: true });
  const problema = senhaForte(senha);
  if (problema) sair(`Senha fraca: ${problema}.`);
  if ((await perguntar('Repita a senha: ', { oculto: true })) !== senha) sair('As senhas não conferem.');

  const segredo = base32Encode(crypto.randomBytes(20));
  const hash = await hashSenha(senha);
  const rotulo = encodeURIComponent(`Girassol Painel:${nome}`);
  const otpauth = `otpauth://totp/${rotulo}?secret=${segredo}&issuer=${encodeURIComponent('Girassol Painel')}&digits=6&period=30`;

  console.log('\n1) No celular, abra o Google Authenticator (ou Microsoft Authenticator, Authy…)');
  console.log('   → "+" → "Inserir chave de configuração" e preencha:');
  console.log(`      Conta: Girassol Painel (${nome})`);
  console.log(`      Chave: ${segredo.match(/.{1,4}/g).join(' ')}`);
  console.log('      Tipo:  Baseado no tempo');
  console.log(`   (Ou gere um QR Code a partir deste endereço, num programa offline: ${otpauth})`);

  const conferencia = (await perguntar('\n2) Digite o código de 6 dígitos que apareceu no app: ')).replace(/\s/g, '');
  const passo = Math.floor(Date.now() / 30000);
  if (![passo - 1, passo, passo + 1].some((p) => codigoTotp(segredo, p) === conferencia)) {
    sair('Código não confere. Verifique a chave digitada e se o relógio do celular está certo, e rode o script de novo.');
  }

  console.log('\n3) Tudo certo! Adicione esta linha à variável PAINEL_USUARIOS na Hostinger');
  console.log('   (se já houver outros usuários, separe com uma vírgula):\n');
  console.log(`${nome}:${hash}:${segredo}`);
  console.log('\nGuarde a chave do 2FA em local seguro (ex.: gerenciador de senhas) e não compartilhe esta linha.\n');
  rl.close();
})();
