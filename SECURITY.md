# Segurança

## Como relatar um problema

Encontrou uma falha de segurança no site? **Não abra uma issue pública.** Use o botão **"Report a vulnerability"** na aba [Security](https://github.com/Edumnzes/Girassol/security) deste repositório, ou fale diretamente com o responsável técnico pelo site. Respondemos o mais rápido possível.

## Proteções do site

### Servidor (`server.js`)
- **Lista de arquivos públicos**: só as páginas, `main.js`, `blog.js`, `styles.min.css`, `robots.txt` e a pasta `ARQUIVOS/` são servidos. Código, configuração, `.git`, `.env`, `lib/`, `robo/`, `painel/`, `scripts/` e os arquivos `.md` dos posts retornam 404.
- Só aceita requisições `GET` e `HEAD` (o `POST` existe apenas no formulário de login do painel).
- **Bloqueio de path traversal**: caminhos como `/../` são normalizados e não saem da pasta do site.
- **Cabeçalhos de segurança** em todas as respostas:
  - `Content-Security-Policy` (define de onde scripts, imagens e fontes podem vir; o painel e a tela de login têm políticas próprias, mais restritas);
  - `Strict-Transport-Security` (força HTTPS);
  - `X-Frame-Options` / `frame-ancestors` (contra clickjacking);
  - `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e `Cross-Origin-Opener-Policy`.

### Blog
- O Markdown dos posts é convertido com **HTML cru desativado**: qualquer `<script>`, `<iframe>` ou `onerror=` no texto aparece como texto e não executa.
- Links e imagens só aceitam `https://`, `http://`, `mailto:`, `tel:` e caminhos internos (`javascript:` é descartado).
- Links externos abrem com `rel="noopener noreferrer nofollow"`.
- Dados estruturados (JSON-LD) são escapados para não fechar a tag `<script>`.

### Painel do blog (`lib/painel.js`)
Quatro camadas, nesta ordem:
1. **Endereço secreto** (`PAINEL_CAMINHO`), definido só na Hostinger e nunca no repositório. `/admin`, `/painel` e qualquer outro endereço respondem 404, igual a uma página inexistente. Sem a variável, o painel não existe.
2. **Usuário + senha + código 2FA (TOTP)**:
   - senhas guardadas só como hash **scrypt** (N=32768), com comparação em tempo constante;
   - usuário inexistente leva o mesmo tempo que senha errada (não revela quem existe);
   - código de 6 dígitos do app autenticador (RFC 6238); um código já usado não pode ser reutilizado;
   - **5 erros bloqueiam o usuário e 20 bloqueiam o IP por 15 minutos**, com atraso extra a cada falha;
   - formulário só aceito da própria origem e com corpo de no máximo 4 KB;
   - mensagem de erro genérica e registro (*log*) de cada tentativa aceita ou recusada.
3. **Sessão** em cookie `__Host-` (`HttpOnly`, `Secure`, `SameSite=Lax`) com token aleatório de 256 bits, válida por 8 horas e apagada no "Sair". O `config.yml` e o login do GitHub só respondem com sessão ativa. As páginas do painel vão com `noindex` e `no-store`, e a tela de login roda sem JavaScript (CSP `script-src 'none'`).
4. **Login do GitHub** (OAuth) com proteção contra CSRF (`state` em cookie) e token entregue só à origem do site. Só quem tem **permissão de escrita no repositório** publica, com escopo mínimo `public_repo`. O segredo do OAuth fica só na Hostinger.

### Robô de notícias
- Chaves guardadas em **GitHub Secrets**, nunca no código.
- O conteúdo das páginas pesquisadas é tratado como dado, não como instrução (proteção contra *prompt injection*).
- Antes de publicar, o artigo passa por checagem: tamanho mínimo, ausência de HTML perigoso, **só cita links que a busca realmente encontrou** e não repete assunto já publicado.
- O workflow tem permissão mínima (`contents: write`), tempo máximo de execução e actions fixadas por hash de commit.

### Repositório
- **Dependabot** abre atualizações semanais de dependências e mensais das GitHub Actions.
- O workflow **Verificação do site** roda a cada push: `npm audit`, validação dos posts e testes de rotas, incluindo a garantia de que arquivos internos não ficam expostos.
- `.gitignore` bloqueia `.env`, chaves e certificados.

## Recomendações para o dono do repositório

Configurações do GitHub que não ficam no código (Settings do repositório):

1. **Branch protection** na `main`: exigir que o workflow "Verificação do site" passe antes do merge e bloquear *force push*.
2. **Code security**: ativar *Dependabot alerts*, *Secret scanning* com *Push protection* e *CodeQL (default setup)*.
3. **Autenticação em dois fatores (2FA)** em todas as contas com acesso ao repositório, à Hostinger, à Cloudflare e ao registrador do domínio.
4. Dar acesso de escrita só a quem publica no blog (Settings → Collaborators) e revisar a lista periodicamente.
