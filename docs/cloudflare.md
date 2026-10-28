# Cloudflare

A Cloudflare fica **na frente** da Hostinger: os visitantes acessam a Cloudflare, que entrega o site mais rápido (cache e CDN no Brasil) e bloqueia ataques (firewall, proteção DDoS e contra robôs). O plano **gratuito** atende este site.

> **Antes de começar:** os servidores DNS do domínio ficam na Wix (veja [hospedagem-e-dominio.md](hospedagem-e-dominio.md)). Ao trocar para os da Cloudflare, atualize a variável `NS_ESPERADOS` do vigia do domínio.

## O site já está preparado

O `server.js` já envia os cabeçalhos de segurança (HSTS, CSP etc.), redireciona `www` para o domínio principal e marca o que pode ir para cache:
- `ARQUIVOS/` (imagens e vídeos): cache de 30 dias
- CSS e JS: 1 dia
- HTML, blog, sitemap: sempre atualizado (`no-cache`)
- painel e `/api`: nunca em cache

## Passo a passo

### 1. Criar a conta e adicionar o site
1. Crie a conta em <https://dash.cloudflare.com/sign-up> e **ative a autenticação em dois fatores**.
2. **Add a domain** → `girassolsolar.com` → plano **Free**.
3. A Cloudflare importa os registros DNS. Confira se existem:
   - Registro **A** `girassolsolar.com` → IP da Hostinger (hPanel → Sites → girassolsolar.com → Informações do plano / DNS)
   - Registro **CNAME** `www` → `girassolsolar.com`
   - Os dois com a **nuvem laranja (Proxied)** ligada.
   - Registros de e-mail (MX, TXT/SPF), se existirem, **sem** nuvem laranja.

### 2. Trocar os servidores DNS
A Cloudflare mostra dois servidores (ex.: `ana.ns.cloudflare.com`). Na **Wix** → Domínios → `girassolsolar.com` → configurações avançadas, troque os servidores DNS atuais (`dns-parking.com`) pelos da Cloudflare. A ativação leva de minutos a algumas horas.

### 3. SSL/TLS
- **SSL/TLS → Overview:** modo **Full (strict)**. Exige certificado válido na Hostinger (SSL ativo no hPanel). Se a Hostinger não conseguir renovar o certificado com o proxy ligado, use **Full**.
- **SSL/TLS → Edge Certificates:**
  - **Always Use HTTPS:** ligado
  - **Minimum TLS Version:** 1.2
  - **Automatic HTTPS Rewrites:** ligado
  - **HSTS:** pode deixar desligado aqui, porque o site já envia o cabeçalho.

### 4. Segurança
- **Security → Settings:** Security Level **Medium**; **Bot Fight Mode** ligado.
- **Security → WAF → Managed rules:** ative o conjunto gratuito da Cloudflare.
- **Security → WAF → Rate limiting rules** (1 regra grátis): proteja o login do painel:
  - Se o caminho começa com o **endereço secreto do painel** (`PAINEL_CAMINHO`), mais de **10 requisições em 1 minuto** por IP → **Block** por 10 minutos.
  - O site já bloqueia sozinho após erros de senha; a regra da Cloudflare barra o ataque antes de ele chegar ao servidor.
- **DNS → Settings:** ative o **DNSSEC** e copie o registro DS para a Wix, se ela oferecer a opção.

### 5. Desempenho e cache
- **Speed → Optimization:** **Brotli** ligado e **Early Hints** ligado.
- **Caching → Configuration:** Caching Level **Standard**; Browser Cache TTL **Respect Existing Headers**.
- **Caching → Cache Rules → Create rule** ("Imagens e vídeos"):
  - Quando: o caminho começa com `/ARQUIVOS/`
  - Então: **Eligible for cache**, Edge TTL **1 mês**
- **Rules → Configuration Rules:** para o caminho `/api` e o endereço do painel, **Cache Level: Bypass**.

### 6. Na Hostinger
- Desligue o **CDN da Hostinger** (hPanel → Sites → CDN) para não haver dois caches.
- Mantenha o SSL da Hostinger ativo (necessário para o modo Full strict).

## Conferir se está funcionando

```bash
curl -sI https://girassolsolar.com | grep -iE "server|cf-ray|cf-cache-status|strict-transport"
```

Deve aparecer `server: cloudflare` e um `cf-ray`. Em imagens (`/ARQUIVOS/...`), na segunda visita, `cf-cache-status: HIT`.

## Depois de publicar mudanças de imagem
Se trocar uma imagem **mantendo o mesmo nome de arquivo**, limpe o cache: **Caching → Configuration → Purge Cache → Custom Purge** com o endereço da imagem. Artigos e páginas não precisam disso.
