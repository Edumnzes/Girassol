# Robô de notícias

O robô pesquisa as notícias mais recentes sobre energia solar, escreve um artigo original em português com SEO e fontes citadas, escolhe uma imagem de capa e publica no blog. Ele roda no **GitHub Actions** (servidores do GitHub), então não pesa no site.

- Código: [`robo/robo-noticias.mjs`](../robo/robo-noticias.mjs)
- Agenda: [`.github/workflows/robo-noticias.yml`](../.github/workflows/robo-noticias.yml), **segundas e quintas às 8h** (horário da Bahia)

## Como funciona

1. **Pesquisa**: o Claude (modelo `claude-opus-5-5`, da Anthropic) busca na web as notícias da última semana, priorizando o que afeta o bolso do cliente baiano (tarifas, ANEEL, Lei 14.300, Coelba, financiamento) e evitando assuntos já publicados.
2. **Redação**: escreve um artigo de 700 a 1100 palavras, em linguagem simples, com subtítulos, palavra-chave no título e um convite para a simulação no WhatsApp.
3. **Checagem automática**: o artigo é reprovado (e nada é publicado) se for curto demais, tiver HTML perigoso, citar um link que a busca não encontrou ou repetir as fontes de um artigo anterior.
4. **Imagem**: busca uma foto no **Unsplash**, com crédito ao fotógrafo. Sem a chave do Unsplash, usa uma **foto real de obra da Girassol**.
5. **Publicação**: salva `blog/posts/<endereço>.md`, faz o commit, e a Hostinger publica em seguida.

## Configuração (uma vez só)

### 1. Chave da API da Anthropic (obrigatória)
1. Crie uma conta em <https://console.anthropic.com> e cadastre um cartão em **Billing**.
2. Em **API Keys**, clique em **Create Key** e copie a chave.
3. No GitHub: repositório → **Settings → Secrets and variables → Actions → New repository secret**.
   - Nome: `ANTHROPIC_API_KEY`
   - Valor: a chave copiada

> Recomendado: em **console.anthropic.com → Limits**, defina um **limite mensal de gasto** (ex.: US$ 15).

### 2. Chave do Unsplash (opcional, para fotos variadas)
1. Crie uma conta de desenvolvedor em <https://unsplash.com/developers> → **New Application**.
2. Copie a **Access Key** e crie o segredo `UNSPLASH_ACCESS_KEY` do mesmo jeito.

Sem essa chave, o robô usa as fotos de obras que já estão no site.

## Custos estimados

Cada artigo usa algumas buscas na web e a geração do texto: **em torno de US$ 0,50 a US$ 1,00 por artigo**. Com 2 artigos por semana, algo entre **US$ 4 e US$ 8 por mês**. O valor exato aparece no painel da Anthropic (**Usage**). O Unsplash e o GitHub Actions são gratuitos neste uso.

## Uso no dia a dia

### Publicar um artigo agora
GitHub → aba **Actions** → **Robô de notícias do blog** → **Run workflow** → escolha o modo → **Run workflow**.

### Revisar antes de publicar
Quer ler cada artigo antes de ir ao ar? Em **Settings → Secrets and variables → Actions → Variables**, crie a variável `MODO_PUBLICACAO` com o valor `rascunho`. Os artigos vão chegar como **rascunho** no [painel](painel-do-blog.md): é só revisar, desmarcar "Rascunho" e publicar.

### Mudar os dias e horários
Edite a linha `cron` em `.github/workflows/robo-noticias.yml`. O horário é em UTC (Bahia = UTC−3). Exemplos:
- `"0 11 * * 1,4"`: segunda e quinta, 8h
- `"0 11 * * 1-5"`: de segunda a sexta, 8h
- `"0 12 * * 3"`: quarta, 9h

### Pausar o robô
GitHub → **Actions** → **Robô de notícias do blog** → menu **⋯** → **Disable workflow**.

### Apagar ou corrigir um artigo do robô
Pelo [painel do blog](painel-do-blog.md), como qualquer outro artigo.

## Testar sem gastar nada

```bash
cd robo
npm install
npm run simular
```

O modo simulação cria um artigo de teste em `blog/posts/teste-robo-noticias.md` sem chamar nenhuma API. **Apague o arquivo depois do teste.**

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| A execução termina verde, mas o resumo diz "Nenhum artigo publicado" | O segredo `ANTHROPIC_API_KEY` não foi criado. |
| Falha com "Artigo reprovado na checagem" | A checagem barrou um artigo fraco ou repetido. É normal acontecer às vezes; a próxima execução tenta outro assunto. |
| Falha com "Erro da API da Anthropic (401)" | Chave inválida ou revogada. Gere outra e atualize o segredo. |
| Falha com "Erro da API da Anthropic (429/529)" | Limite de uso ou instabilidade momentânea. Rode de novo mais tarde. |
| Artigo publicado, mas não aparece no site | A Hostinger ainda está implantando (aguarde 1–2 min) ou a implantação automática está desligada no hPanel. |
