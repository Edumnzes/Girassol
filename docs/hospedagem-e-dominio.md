# Hospedagem e domínio

## Onde está cada coisa

| Item | Onde | Observação |
|---|---|---|
| Código | GitHub: `Edumnzes/Girassol` (público) | Branch `main` = site no ar |
| Hospedagem | Hostinger, plano Business, **app Node.js** | Implantação automática a cada commit na `main` |
| Domínio `girassolsolar.com` | Registrado na **Wix** (válido até 21/10/2031) | Servidores DNS: `apollo` e `athena.dns-parking.com` (Hostinger) |
| CDN e proteção (opcional) | Cloudflare | Veja [cloudflare.md](cloudflare.md) |

## Hostinger (app Node.js)

- **Arquivo de entrada:** `server.js` (o `main.js` também funciona: quando roda no Node, ele carrega o `server.js`).
- **Comando de instalação:** `npm install`. Só instala `marked` e `yaml`; o Tailwind é ferramenta de desenvolvimento.
- **Implantações:** hPanel → Sites → girassolsolar.com → **Implantações** mostra cada commit implantado e o status.
- **Variáveis de ambiente:** veja a tabela no [README](../README.md#variáveis-de-ambiente).
- **CDN da Hostinger:** se usar a Cloudflare, deixe o CDN da Hostinger **desligado** para não haver dois caches.

## Domínio: histórico e prevenção

**O que aconteceu em outubro de 2026:** em 22/10 a Wix suspendeu o domínio (status `clientHold`), provavelmente por falta de confirmação do e-mail de contato. A suspensão foi retirada em 25/10, mas os servidores DNS voltaram para os da Wix (`parastorage.com`). Em 28/10 foram trocados de novo para os da Hostinger, e o site voltou.

### Vigia automático (já ativo)
O workflow **Vigia do domínio** (`.github/workflows/monitorar-dominio.yml`) roda **a cada 6 horas** e confere:

| Verificação | Alerta quando |
|---|---|
| Status do registro | aparece `client hold`, `server hold`, `redemption period` ou `pending delete` |
| Vencimento do domínio | faltam 60 dias ou menos |
| Servidores DNS | mudam (ex.: voltam para a Wix) |
| Site e blog | não respondem ou mostram outro conteúdo |
| Certificado SSL | é inválido ou vence em 15 dias ou menos |

Se algo falhar, o GitHub **envia um e-mail** para a conta que mantém o repositório, com o motivo no resumo da execução (aba **Actions → Vigia do domínio**). Também dá para rodar na hora: **Actions → Vigia do domínio → Run workflow**.

> Se um dia os servidores DNS mudarem de propósito (ex.: Cloudflare), atualize a variável do repositório `NS_ESPERADOS` (Settings → Secrets and variables → Actions → Variables) com os novos, separados por vírgula.

> O GitHub pausa workflows agendados de repositórios sem nenhuma atividade por 60 dias. Os commits do blog e do robô mantêm o repositório ativo; se pausar, o GitHub avisa por e-mail e basta reativar em **Actions**.

### Para não cair de novo (na conta da Wix do cliente)
- [ ] **Confirmar o e-mail de contato do domínio** e mantê-lo atualizado (um e-mail que alguém leia).
- [ ] **Renovação automática ligada**, com cartão válido.
- [ ] **Verificação em duas etapas** na conta da Wix.
- [ ] **Transfer lock** (bloqueio de transferência) ligado. Já está: `client transfer prohibited`.
- [ ] Recomendado: **transferir o domínio para a Hostinger**, para ficar tudo numa conta só, ou para a **Cloudflare Registrar** (preço de custo). A transferência exige o código de autorização (EPP) que a Wix fornece.

**Conferir o status manualmente** (qualquer computador):
```bash
curl -s https://rdap.verisign.com/com/v1/domain/girassolsolar.com
```
No campo `"status"`, `client hold` significa suspenso. `client transfer prohibited` e `client update prohibited` são normais (proteções).

## Checklist pós-lançamento
- [x] `https://girassolsolar.com` abre com cadeado (Lifetime SSL ativo no hPanel)
- [x] `https://www.girassolsolar.com` redireciona para `https://girassolsolar.com`
- [ ] Cadastrar o site no [Google Search Console](https://search.google.com/search-console) e enviar `https://girassolsolar.com/sitemap.xml`
- [x] Configurar o login do [painel do blog](painel-do-blog.md#configuração-inicial-uma-vez-só)
- [ ] (Opcional) Ativar a [Cloudflare](cloudflare.md)
