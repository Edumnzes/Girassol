# Hospedagem e domínio

## Onde está cada coisa

| Item | Onde | Observação |
|---|---|---|
| Código | GitHub: `Edumnzes/Girassol` (público) | Branch `main` = site no ar |
| Hospedagem | Hostinger, plano Business, **app Node.js** | Implantação automática a cada commit na `main` |
| Domínio `girassolsolar.com` | Registrado na **Wix** (válido até 10/2027) | Servidores DNS apontam para a Hostinger |
| CDN e proteção (opcional) | Cloudflare | Veja [cloudflare.md](cloudflare.md) |

## Hostinger (app Node.js)

- **Arquivo de entrada:** `server.js` (o `main.js` também funciona: quando roda no Node, ele carrega o `server.js`).
- **Comando de instalação:** `npm install`. Só instala `marked` e `yaml`; o Tailwind é ferramenta de desenvolvimento.
- **Implantações:** hPanel → Sites → girassolsolar.com → **Implantações** mostra cada commit implantado e o status.
- **Variáveis de ambiente:** veja a tabela no [README](../README.md#variáveis-de-ambiente).
- **CDN da Hostinger:** se usar a Cloudflare, deixe o CDN da Hostinger **desligado** para não haver dois caches.

## Domínio: situação em 24/10/2026

O registro público mostra o domínio com status **`clientHold`** (suspenso pela Wix) desde 22/10/2026. Por isso o site não abre, mesmo com a Hostinger funcionando.

**Para resolver** (dono da conta Wix onde o domínio foi comprado):
1. Procure na caixa de entrada (e no spam) um e-mail da Wix ou da ICANN pedindo para **confirmar os dados de contato do domínio**, e clique no link.
2. Se não encontrar, entre na Wix → **Domínios** → `girassolsolar.com` e veja o aviso, ou fale com o suporte da Wix.
3. Depois de liberado, o site volta em algumas horas, sem mexer na Hostinger.

**Como conferir o status** (qualquer computador):
```bash
curl -s https://rdap.verisign.com/com/v1/domain/girassolsolar.com
```
Procure o campo `"status"`: `client hold` = suspenso; sem ele = normal.

**Recomendação:** depois de resolvido, considere **transferir o domínio para a Cloudflare Registrar** (preço de custo, sem taxa de renovação inflada, e já integra com a [configuração da Cloudflare](cloudflare.md)), ou para a própria Hostinger.

## Checklist depois que o domínio voltar
- [ ] `https://girassolsolar.com` abre com cadeado (SSL ativo no hPanel)
- [ ] `https://www.girassolsolar.com` redireciona para `https://girassolsolar.com`
- [ ] Cadastrar o site no [Google Search Console](https://search.google.com/search-console) e enviar `https://girassolsolar.com/sitemap.xml`
- [ ] Configurar o login do [painel do blog](painel-do-blog.md#configuração-inicial-uma-vez-só)
- [ ] (Opcional) Ativar a [Cloudflare](cloudflare.md)
