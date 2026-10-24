# Painel do blog: como publicar artigos

O painel permite escrever, editar e publicar artigos **sem programar**. Tudo o que é salvo vai para o GitHub, e o site se atualiza sozinho em cerca de 1 minuto.

> **O endereço do painel é secreto e não aparece neste repositório.** Quem precisa dele recebe do responsável pelo site. `girassolsolar.com/admin` não existe de propósito.

---

## Para quem publica

### 1. Pré-requisitos (uma vez só)
Peça ao responsável pelo site:
- o **endereço do painel**;
- seu **usuário e senha**, mais a **chave do app autenticador** (veja [Criar um usuário](#criar-um-usuário-do-painel));
- um convite de **colaborador** no GitHub (você precisa de uma conta gratuita: <https://github.com/signup>).

Instale no celular um app autenticador: **Google Authenticator**, **Microsoft Authenticator** ou **Authy**.

### 2. Entrar (duas etapas)
1. Abra o endereço do painel. Aparece a tela **"Painel do blog — Acesso restrito"**.
2. Digite **usuário**, **senha** e o **código de 6 dígitos** que o app autenticador mostra naquele momento. O código muda a cada 30 segundos.
3. Na tela seguinte, clique em **Entrar com GitHub** e autorize.

A sessão dura **8 horas**. Para sair antes, use o botão **"Sair do painel"** no canto inferior esquerdo, principalmente em computador compartilhado.

> **Errou 5 vezes?** O acesso fica bloqueado por 15 minutos. Isso protege contra quem tenta adivinhar senhas.

### 3. Escrever um artigo
1. Clique em **Artigos** → **+ Artigo**.
2. Preencha os campos:

| Campo | Dica |
|---|---|
| **Título** | Até 65 caracteres, com o assunto principal. Ex.: "Bandeira tarifária de novembro: o que muda na sua conta". |
| **Resumo** | 1 ou 2 frases (até 160 caracteres). É o texto que aparece no Google e nos cards. |
| **Data de publicação** | Uma data futura deixa o artigo **agendado**: ele aparece sozinho no dia. |
| **Categoria** | Vira um filtro na página do blog. |
| **Palavras-chave** | Termos que as pessoas pesquisariam. Ex.: energia solar, Irecê, conta de luz. |
| **Imagem de capa** | Foto horizontal (ideal 1600 × 900 px). Use fotos próprias ou de bancos gratuitos como [Unsplash](https://unsplash.com) e preencha o crédito. |
| **Descrição da imagem** | O que aparece na foto. Ajuda no Google e na acessibilidade. |
| **Fontes** | Para notícias, coloque os sites de onde vieram as informações. |
| **Texto do artigo** | Use os botões do editor para subtítulos, negrito, listas e links. |

3. A **prévia** ao lado mostra como o artigo vai ficar no site.

**Dica:** cada subtítulo (botão "Heading 2" do editor) entra automaticamente no **"Neste artigo"**, o sumário clicável da página. Use de 3 a 5 subtítulos.

### 4. Publicar
- Clique em **Publicar** → **Publicar agora**. Em cerca de 1 minuto o artigo está no ar.
- Quer revisar antes? Marque **Rascunho (não publicar ainda)**: o artigo fica salvo, mas não aparece no site.

### 5. Editar ou apagar
Abra o artigo na lista, altere e clique em **Publicar** de novo. Para remover, use **Excluir entrada**. O GitHub guarda todas as versões, então nada se perde de verdade.

### Boas práticas
- **Escreva para o cliente**, não para técnicos: frases curtas, explique os termos.
- Termine convidando o leitor a pedir uma simulação no WhatsApp.
- **Não copie textos de outros sites**: escreva com suas palavras e cite a fonte.
- **Nunca compartilhe** sua senha, o código do app ou o endereço do painel por mensagem.

---

## Para o responsável técnico

### Como o acesso é protegido

```
Endereço secreto (PAINEL_CAMINHO)        → qualquer outro endereço responde 404
  └─ Usuário + senha + código 2FA         → 5 erros = bloqueio de 15 min (usuário e IP)
       └─ Sessão de 8 h (cookie seguro)   → protege também config.yml e o login do GitHub
            └─ Login do GitHub            → só quem tem permissão de escrita publica
```

Código: [`lib/painel.js`](../lib/painel.js) (senha, 2FA, sessão, bloqueio) e [`lib/github-oauth.js`](../lib/github-oauth.js).

### Configuração inicial (uma vez só)

**1. Escolher o endereço secreto**
- Invente um caminho com **12 ou mais caracteres**, misturando letras e números, por exemplo `/gestao-7k2m9q4x` (**não use este**).
- Palavras óbvias (`admin`, `painel`, `login`, `wp-admin`...) são recusadas.
- Guarde-o num gerenciador de senhas. **Nunca escreva o endereço no repositório**, porque ele é público.

**2. Criar o primeiro usuário** (veja a próxima seção).

**3. Criar o OAuth App do GitHub**
1. <https://github.com/settings/applications/new> (na conta dona do repositório).
2. Preencha:
   - **Application name:** `Painel do Blog Girassol`
   - **Homepage URL:** `https://girassolsolar.com`
   - **Authorization callback URL:** `https://girassolsolar.com/SEU-ENDERECO-SECRETO/auth/callback`
3. **Register application** → **Generate a new client secret**.

**4. Variáveis de ambiente na Hostinger**

hPanel → Sites → girassolsolar.com → app Node.js → **Variáveis de ambiente**:

| Variável | Valor |
|---|---|
| `PAINEL_CAMINHO` | o endereço secreto, ex.: `/gestao-7k2m9q4x` |
| `PAINEL_USUARIOS` | a linha gerada pelo script (vários usuários separados por vírgula) |
| `GITHUB_OAUTH_CLIENT_ID` | o *Client ID* do OAuth App |
| `GITHUB_OAUTH_CLIENT_SECRET` | o *Client secret* do OAuth App |

Clique em **Reimplantar**. Sem `PAINEL_CAMINHO`, o painel simplesmente não existe (é o modo mais seguro).

### Criar um usuário do painel

No computador, dentro da pasta do projeto:

```bash
npm run criar-usuario
```

O script:
1. pede o **nome** e a **senha**, que não aparece na tela (mínimo 12 caracteres, misturando tipos);
2. gera a **chave do app autenticador**. A pessoa adiciona no celular em **"+" → "Inserir chave de configuração"**;
3. pede um código do app para **conferir** se ficou certo;
4. mostra a linha `usuario:hash:chave` para colocar em `PAINEL_USUARIOS`.

A senha **não é guardada**, só um *hash* (scrypt), que não dá para reverter. Mesmo assim, trate a linha como segredo.

### Remover o acesso de alguém
1. Apague a parte daquela pessoa em `PAINEL_USUARIOS` e reimplante.
2. Remova-a dos colaboradores do GitHub (Settings → Collaborators).

### Trocar senha ou celular perdido
Gere um novo usuário com o mesmo nome (`npm run criar-usuario`) e substitua a linha antiga em `PAINEL_USUARIOS`.

### Suspeita de invasão
1. **Troque o `PAINEL_CAMINHO`** e atualize a *callback URL* do OAuth App.
2. Gere novas senhas e chaves 2FA para todos.
3. No OAuth App, clique em **Revoke all user tokens**.
4. Reimplante. Todas as sessões ativas caem na hora.
5. Veja os registros (*logs*) do app na Hostinger: cada login aceito ou recusado aparece como `[painel] Login...`.

### Dar acesso de publicação no GitHub
Repositório → **Settings → Collaborators → Add people** → permissão **Write**. A pessoa aceita o convite que chega por e-mail.

### Testar no computador
1. Copie `.env.exemplo` para `.env`, defina `PAINEL_CAMINHO` e cole um usuário gerado em `PAINEL_USUARIOS`.
2. Rode, em dois terminais:
   ```bash
   npm run dev
   ```
   ```bash
   npx decap-server
   ```
3. Abra `http://localhost:3000/SEU-ENDERECO/`, entre com usuário, senha e código, e clique em **Entrar**. No modo local, o painel salva direto nos arquivos do computador, sem passar pelo GitHub.
